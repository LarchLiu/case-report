<!-- eslint-disable no-alert -->
<!-- eslint-disable no-console -->
<script setup lang="ts">
import type { CaseReport, ImageInfo, User } from '~/types'

const images = ref<ImageInfo[]>([])
// const salaryPeriod = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const making = ref(false)
const selectedUser = ref<User[]>([])
const caseReports = ref<CaseReport[]>([])
const editingCell = ref<{ rowIndex: number, field: keyof (User | CaseReport) } | null>(null)

const { data: users, error: usersError, refresh } = await useFetch('/api/users')

const allSelected = computed({
  get: () => users.value && users.value.length > 0 && selectedUser.value.length === users.value.length,
  set: (value: boolean) => {
    if (users.value) {
      selectedUser.value = value ? [...users.value] : []
    }
  },
})

function toggleUser(user: User) {
  const index = selectedUser.value.findIndex(u => u.id === user.id)
  if (index > -1) {
    selectedUser.value.splice(index, 1)
  }
  else {
    selectedUser.value.push(user)
  }
}

watch(usersError, () => {
  if (usersError && usersError.value) {
    alert(`获取人员信息失败：${usersError.value.message || usersError.value.statusMessage}`)
  }
})

function startEditing(rowIndex: number, field: keyof User) {
  editingCell.value = { rowIndex, field: field as keyof (User | CaseReport) }
}

async function finishEditing() {
  let user
  if (users.value && users.value.length && editingCell.value && editingCell.value.rowIndex) {
    user = users.value[editingCell.value.rowIndex]
    await $fetch('/api/users', {
      method: 'PATCH',
      body: user,
    })
    await refresh()
  }
  nextTick(() => {
    editingCell.value = null
  })
}

function updateCellValue(_event: Event, _rowIndex: number, _field: keyof User) {
  finishEditing()
}

function startEditingCaseReport(rowIndex: number, field: keyof CaseReport) {
  editingCell.value = { rowIndex, field: field as keyof (User | CaseReport) }
}

async function finishEditingCaseReport() {
  if (caseReports.value && caseReports.value.length && editingCell.value && editingCell.value.rowIndex >= 0) {
    const report = caseReports.value[editingCell.value.rowIndex]
    await $fetch('/api/report', {
      method: 'PATCH',
      body: report,
    })
    // No refresh needed for caseReports as it's a static display after fetch
    await getCaseReport() // Refresh the case report data
  }
  nextTick(() => {
    editingCell.value = null
  })
}

function updateCaseReportCellValue(_event: Event, _rowIndex: number, _field: keyof CaseReport) {
  console.log('Updating case report cell value', _rowIndex, _field)
  finishEditingCaseReport()
}

function openFileInput() {
  images.value = []
  fileInput.value && fileInput.value.click()
}

function handleFileChange(event: any) {
  const files = event.target.files
  console.log(files.length)
  if (files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const reader = new FileReader()
      reader.onload = (e) => {
        images.value.push({
          file,
          url: e.target!.result as string,
          name: file.name,
        })
      }
      reader.readAsDataURL(file)
    }
  }
}

async function uploadImages() {
  if (images.value.length === 0) {
    alert('Please select images to upload.')
    return
  }

  uploading.value = true
  const formData = new FormData()
  images.value.forEach((image) => {
    formData.append(`image`, image.file)
  })

  try {
    const res = await $fetch('/api/case', {
      method: 'POST',
      body: formData,
    })

    alert(`有效病例信息: \n${res.info.map(u => `${u.user.name} ${u.case.hospital} ${u.case.report_date}`).join('\n')}\n${res.errorMessages.length ? `无效病例信息: \n${res.errorMessages.join('\n')}` : ''}`)
    console.log('Upload successful:', res)
    if (res.errorMessages.length === 0) {
      images.value = []
    }
  }
  catch (error: any) {
    console.error('Error uploading images:', error)
    alert(error.message || error.statusMessage)
  }
  finally {
    uploading.value = false
    await refresh()
  }
}

async function getCaseReport() {
  try {
    const response = await $fetch(`/api/case?userIds=${selectedUser.value.map(u => u.id).join(',')}`)
    caseReports.value = response || []
    console.log(response)
  }
  catch (error: any) {
    console.error('Error fetching case report:', error.data)
    alert(error.data?.message || error.message || error.statusMessage)
  }
}

async function deleteSelectedUsers() {
  if (selectedUser.value.length === 0) {
    alert('请选择要删除的人员。')
    return
  }

  if (!confirm(`确定要删除选中的 ${selectedUser.value.length} 位人员吗？`)) {
    return
  }

  try {
    const idsToDelete = selectedUser.value.map(u => u.id)
    await $fetch('/api/users', {
      method: 'DELETE',
      body: { ids: idsToDelete },
    })
    alert('人员删除成功！')
    selectedUser.value = [] // Clear selection after deletion
    await refresh() // Refresh the user list
  }
  catch (error: any) {
    console.error('Error deleting users:', error)
    alert(`删除人员失败：${error.message || error.statusMessage}`)
  }
}
</script>

<template>
  <div class="p-4 border border-gray-300 rounded-lg shadow-md">
    <h2 class="text-xl font-semibold mb-4">
      添加病例
    </h2>

    <button
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      @click="openFileInput"
    >
      选择图片(可多选)
    </button>

    <div v-if="images.length > 0" class="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="(image, index) in images" :key="index" class="relative">
        <img :src="image.url" :alt="image.name" class="w-full h-32 object-cover rounded-md">
        <p class="text-sm text-gray-600 mt-1 truncate">
          {{ image.name }}
        </p>
      </div>
    </div>

    <button
      v-if="images.length > 0"
      class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
      :disabled="images.length === 0 || uploading"
      @click="uploadImages"
    >
      {{ uploading ? 'Uploading...' : '上传' }}
    </button>

    <button
      v-if="images.length > 0"
      class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4 ml-4"
      :disabled="images.length === 0 || uploading"
      @click="images = []"
    >
      {{ '清除图片' }}
    </button>

    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/*"
      class="hidden"
      @change="handleFileChange"
    >
    <!-- <div class="my-4">
      <label for="salaryPeriod" class="block text-gray-700 text-xl font-semibold mb-2">工资属期:</label>
      <input
        id="salaryPeriod"
        v-model="salaryPeriod"
        type="date"
        class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      >
    </div> -->

    <div v-if="users && users.length > 0" class="mt-8">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">
          {{ `选择已有人员 (共 ${users.length} 人)` }}
        </h2>
        <button
          v-if="selectedUser.length > 0"
          class="bg-red-500 hover:bg-red-700 text-white text-sm font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
          @click="deleteSelectedUsers"
        >
          删除选中人员
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <!-- <tr>
              <th colspan="8" class="px-6 py-3 text-left text-lg font-medium text-gray-700">
                工资属期: {{ salaryPeriod }} <span v-if="!salaryPeriod && selectedUser.length" class="text-red-500 text-base">请选择工资属期以生成工资表</span>
              </th>
            </tr> -->
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  v-model="allSelected"
                  type="checkbox"
                  class="form-checkbox h-4 w-4 text-blue-600"
                >
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                姓名
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                身份证号码
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                电话号码
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(user, rowIndex) in users" :key="rowIndex">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <input
                  type="checkbox"
                  :checked="selectedUser.some(u => u.id === user.id)"
                  class="form-checkbox h-4 w-4 text-blue-600"
                  @change="toggleUser(user)"
                >
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" @click="startEditing(rowIndex, 'name')">
                <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'name'">
                  {{ user.name }}
                </span>
                <input
                  v-else
                  v-model="user.name"
                  type="text"
                  class="w-full border rounded px-0 py-1"
                  @blur="updateCellValue($event, rowIndex, 'name')"
                  @keydown.enter="updateCellValue($event, rowIndex, 'name')"
                >
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500" @click="startEditing(rowIndex, 'identity')">
                <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'identity'">
                  {{ `${user.identity}` }}
                </span>
                <input
                  v-else
                  v-model="user.identity"
                  type="text"
                  class="w-full border rounded px-0 py-1"
                  @blur="updateCellValue($event, rowIndex, 'identity')"
                  @keydown.enter="updateCellValue($event, rowIndex, 'identity')"
                >
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" @click="startEditing(rowIndex, 'phone')">
                <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'phone'">
                  {{ user.phone }}
                </span>
                <input
                  v-else
                  v-model="user.phone"
                  type="text"
                  class="w-full border rounded px-0 py-1"
                  @blur="updateCellValue($event, rowIndex, 'phone')"
                  @keydown.enter="updateCellValue($event, rowIndex, 'phone')"
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div>
      <button
        v-if="selectedUser.length"
        class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
        :disabled="making"
        @click="getCaseReport"
      >
        {{ making ? '正在生成...' : '获取病例' }}
      </button>
    </div>
    <div v-if="caseReports.length" class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              报告日期
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              医院
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              中文名称
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              英文名称
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              值
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              单位
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              范围
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              提示
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="(report, rowIndex) in caseReports" :key="rowIndex">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" @click="startEditingCaseReport(rowIndex, 'report_date')">
              <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'report_date'">
                {{ report.report_date }}
              </span>
              <input
                v-else
                v-model="report.report_date"
                type="text"
                class="w-full border rounded px-0 py-1"
                @blur="updateCaseReportCellValue($event, rowIndex, 'report_date')"
                @keydown.enter="updateCaseReportCellValue($event, rowIndex, 'report_date')"
              >
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" @click="startEditingCaseReport(rowIndex, 'hospital')">
              <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'hospital'">
                {{ report.hospital }}
              </span>
              <input
                v-else
                v-model="report.hospital"
                type="text"
                class="w-full border rounded px-0 py-1"
                @blur="updateCaseReportCellValue($event, rowIndex, 'hospital')"
                @keydown.enter="updateCaseReportCellValue($event, rowIndex, 'hospital')"
              >
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" @click="startEditingCaseReport(rowIndex, 'chinese_name')">
              <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'chinese_name'">
                {{ report.chinese_name }}
              </span>
              <input
                v-else
                v-model="report.chinese_name"
                type="text"
                class="w-full border rounded px-0 py-1"
                @blur="updateCaseReportCellValue($event, rowIndex, 'chinese_name')"
                @keydown.enter="updateCaseReportCellValue($event, rowIndex, 'chinese_name')"
              >
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" @click="startEditingCaseReport(rowIndex, 'english_name')">
              <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'english_name'">
                {{ report.english_name }}
              </span>
              <input
                v-else
                v-model="report.english_name"
                type="text"
                class="w-full border rounded px-0 py-1"
                @blur="updateCaseReportCellValue($event, rowIndex, 'english_name')"
                @keydown.enter="updateCaseReportCellValue($event, rowIndex, 'english_name')"
              >
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" @click="startEditingCaseReport(rowIndex, 'value')">
              <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'value'">
                {{ report.value }}
              </span>
              <input
                v-else
                v-model="report.value"
                type="text"
                class="w-full border rounded px-0 py-1"
                @blur="updateCaseReportCellValue($event, rowIndex, 'value')"
                @keydown.enter="updateCaseReportCellValue($event, rowIndex, 'value')"
              >
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" @click="startEditingCaseReport(rowIndex, 'unit')">
              <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'unit'">
                {{ report.unit }}
              </span>
              <input
                v-else
                v-model="report.unit"
                type="text"
                class="w-full border rounded px-0 py-1"
                @blur="updateCaseReportCellValue($event, rowIndex, 'unit')"
                @keydown.enter="updateCaseReportCellValue($event, rowIndex, 'unit')"
              >
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" @click="startEditingCaseReport(rowIndex, 'range')">
              <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'range'">
                {{ report.range }}
              </span>
              <input
                v-else
                v-model="report.range"
                type="text"
                class="w-full border rounded px-0 py-1"
                @blur="updateCaseReportCellValue($event, rowIndex, 'range')"
                @keydown.enter="updateCaseReportCellValue($event, rowIndex, 'range')"
              >
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" @click="startEditingCaseReport(rowIndex, 'notifaction')">
              <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'notifaction'">
                {{ report.notifaction }}
              </span>
              <input
                v-else
                v-model="report.notifaction"
                type="text"
                class="w-full border rounded px-0 py-1"
                @blur="updateCaseReportCellValue($event, rowIndex, 'notifaction')"
                @keydown.enter="updateCaseReportCellValue($event, rowIndex, 'notifaction')"
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div>
      <div v-if="caseReports.length">
        <CaseReportChart :case-reports="caseReports" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* No specific styles needed here, Tailwind handles most of it */
</style>
