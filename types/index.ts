export interface ImageInfo {
  file: any
  url: string
  name: string
}

export interface User {
  id: string
  identity: string
  name: string
  sex: string
  phone: string
}

export interface Case {
  id: string
  user_id: string
  hospital: string
  report_date: string
}

export interface Report {
  id: string
  case_id: string
  chinese_name: string
  english_name: string
  value: string
  unit: string
  range: string
  notifaction: string
}

export interface Info {
  user: User
  case: Case
  reports: Report[]
}

export interface CaseReport {
  case_id: string
  report_id: string
  user_id: string
  report_date: string
  hospital: string
  chinese_name: string
  english_name: string
  value: string
  unit: string
  range: string
  notifaction: string
}
