<script setup lang="ts">
import type { EChartsOption, SeriesOption } from 'echarts/types/dist/echarts'
import type { CaseReport } from '~/types'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { onMounted, ref, watch } from 'vue'

const props = defineProps<{
  caseReports: CaseReport[]
}>()

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  LineChart,
  CanvasRenderer,
])

const chartRef = ref<HTMLElement | null>(null)
let myChart: echarts.ECharts | null = null

function initChart() {
  if (chartRef.value) {
    myChart = echarts.init(chartRef.value)
    updateChart()
  }
}

function updateChart() {
  if (!myChart || !props.caseReports || props.caseReports.length === 0) {
    myChart?.clear()
    return
  }

  // Sort data by report_date
  const sortedReports = [...props.caseReports].sort((a, b) => {
    return new Date(a.report_date).getTime() - new Date(b.report_date).getTime()
  })

  // Group data by english_name
  const groupedData: Record<string, CaseReport[]> = sortedReports.reduce((acc, report) => {
    const englishName = report.english_name.replace(/-/g, '').toUpperCase()
    if (!acc[englishName]) {
      acc[englishName] = []
    }
    acc[englishName]!.push(report)
    return acc
  }, {} as Record<string, CaseReport[]>)

  // Get unique sorted dates for x-axis categories
  const uniqueDates = Array.from(new Set(sortedReports.map((report) => {
    const date = new Date(report.report_date)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  }))).sort()

  const series: SeriesOption[] = Object.keys(groupedData).map(englishName => ({
    name: englishName,
    type: 'line',
    data: groupedData[englishName]!.map((report) => {
      const date = new Date(report.report_date)

      return [`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`, Number.parseFloat(report.value), report.hospital, report.unit, report.notifaction]
    }),
    smooth: true,
    emphasis: {
      focus: 'series',
    },
  }))

  const option: EChartsOption = {
    title: {
      text: 'Case Report Trends',
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => { // Revert to any[] for params to avoid complex ECharts type issues
        if (!params || params.length === 0 || !params[0] || !params[0].axisValue) {
          return ''
        }
        let tooltipContent = `${params[0].value[2]}<br/>`
        params.forEach((param: any) => {
          if (param.value !== undefined && param.seriesName !== undefined) { // Explicit checks
            tooltipContent += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${param.color};"></span>`
            tooltipContent += `${param.seriesName}: ${param.value[1]} ${param.value[3] || ''}  ${param.value[4] || ''}<br/>`
          }
        })
        return tooltipContent
      },
    },
    legend: {
      data: Object.keys(groupedData),
      top: 'bottom',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category', // Change to category
      data: uniqueDates, // Add unique dates as categories
      axisLabel: {
        formatter: (value: string) => { // Formatter receives string now
          const date = new Date(value)
          const year = date.getFullYear()
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const day = date.getDate().toString().padStart(2, '0')
          return `${year}-${month}-${day}`
        },
      },
    },
    yAxis: {
      type: 'value',
    },
    series,
  }

  myChart.setOption(option)
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', () => myChart?.resize())
})

watch(() => props.caseReports, () => {
  updateChart()
}, { deep: true })
</script>

<template>
  <div ref="chartRef" style="width: 100%; height: 400px;" />
</template>

<style scoped>
/* Add any specific styles if needed */
</style>
