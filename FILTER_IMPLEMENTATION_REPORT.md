# Hierarchical Filter Implementation Report

**Date:** 2026-01-15
**Feature:** Recruitment Tracking Filter System
**Status:** ✅ Development Mode Complete | ⏳ Production Mode Pending Backend API

---

## Executive Summary

This document describes the hierarchical filter implementation for the recruitment tracking pages (Monthly Report and Weekly Tracking). The system supports filtering by Study → Site → Ward → Condition with live-updating tables and charts.

### Implemented Pages

| Page | File | Status |
|------|------|--------|
| Monthly Report | `src/pages/Tracking/MonthlyReport.jsx` | ✅ Complete |
| Weekly Tracking | `src/pages/Tracking/TrackingWeekly.jsx` | ✅ Complete |

---

## Table of Contents

1. [Filter Hierarchy](#1-filter-hierarchy)
2. [Data Flow Architecture](#2-data-flow-architecture)
3. [Mock Data Structure](#3-mock-data-structure)
4. [Development vs Production Mode](#4-development-vs-production-mode)
5. [Component Integration](#5-component-integration)
6. [API Specifications](#6-api-specifications)
7. [Backend TODO Items](#7-backend-todo-items)
8. [Testing Guide](#8-testing-guide)
9. [File Reference](#9-file-reference)

---

## 1. Filter Hierarchy

### Filter Chain

```
┌─────────────────────────────────────────────────────────────────┐
│                      FILTER HIERARCHY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌───────────┐ │
│  │  STUDY  │ ──► │  SITE   │ ──► │  WARD   │ ──► │ CONDITION │ │
│  │(Required)│     │(Optional)│     │(Optional)│     │(Optional) │ │
│  └─────────┘     └─────────┘     └─────────┘     └───────────┘ │
│       │               │               │               │         │
│   "13NV"          "003"            "4"           "CAP"         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Filter Descriptions

| Filter | Required | Description | Example Values |
|--------|----------|-------------|----------------|
| **Study** | ✅ Yes | Research study code | `13NV`, `54EI`, `1HB` |
| **Site** | ❌ No | Hospital/site code | `003`, `020`, `165`, `103` |
| **Ward** | ❌ No | Ward number within site | `0`, `4` |
| **Condition** | ❌ No | Medical condition | `CAP`, `VAP` |

### Alias Pattern

The system uses hierarchical alias patterns for filtering:

| Selection | Alias Pattern | Description |
|-----------|---------------|-------------|
| Study only | `13NV` | All data for study 13NV |
| Study + Site | `13NV-003` | Data filtered by site 003 |
| Study + Site + Ward | `13NV-003-4` | Data filtered by ward 4 |
| Full filter | `13NV-003-4 CAP` | Data filtered by condition CAP |

---

## 2. Data Flow Architecture

### High-Level Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW DIAGRAM                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐                                                │
│  │   User Action   │                                                │
│  │ (Select Filter) │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐                                                │
│  │  Redux State    │  ◄── currentStudy, currentSite,                │
│  │    Update       │       currentWard, currentCondition            │
│  └────────┬────────┘                                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐                                                │
│  │   useEffect     │  ◄── Triggers on filter change                 │
│  │   Detected      │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    ENVIRONMENT CHECK                         │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  ┌─────────────────────┐    ┌─────────────────────┐        │   │
│  │  │  DEVELOPMENT MODE   │    │  PRODUCTION MODE    │        │   │
│  │  │  (localhost)        │    │  (deployed)         │        │   │
│  │  ├─────────────────────┤    ├─────────────────────┤        │   │
│  │  │ Load mock JSON file │    │ Call backend API    │        │   │
│  │  │ Pattern: {study}-   │    │ with filter params  │        │   │
│  │  │ {site}-{ward}       │    │                     │        │   │
│  │  │ {condition}.json    │    │                     │        │   │
│  │  └──────────┬──────────┘    └──────────┬──────────┘        │   │
│  │             │                          │                    │   │
│  │             ▼                          ▼                    │   │
│  │  ┌─────────────────────┐    ┌─────────────────────┐        │   │
│  │  │ Generate tables     │    │ Display API         │        │   │
│  │  │ from patient data   │    │ response directly   │        │   │
│  │  └──────────┬──────────┘    └──────────┬──────────┘        │   │
│  │             │                          │                    │   │
│  └─────────────┼──────────────────────────┼────────────────────┘   │
│                │                          │                        │
│                └──────────┬───────────────┘                        │
│                           │                                         │
│                           ▼                                         │
│                ┌─────────────────┐                                  │
│                │  Update State   │                                  │
│                │  & Render UI    │                                  │
│                └─────────────────┘                                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### State Management

| State Variable | Location | Purpose |
|----------------|----------|---------|
| `currentStudy` | Redux | Selected study object |
| `currentSite` | Redux | Selected site object |
| `currentWard` | Redux | Selected ward object |
| `currentCondition` | Redux | Selected condition string |
| `selectedTimepoint` | Local | Aggregation period (weekly, monthly, etc.) |
| `endDate` | Local | Report end date filter |
| `usingMockGeneration` | Local | Flag for data source mode |

---

## 3. Mock Data Structure

### File Naming Convention

**Location:** `src/mockData/tracking/`

**Pattern:** `{studyCode}-{siteCode}-{wardCode} {condition}.json`

### Mock File Matrix

| File Name | Study | Site | Ward | Condition |
|-----------|-------|------|------|-----------|
| `13NV.json` | 13NV | All | All | All |
| `13NV-003.json` | 13NV | 003 | All | All |
| `13NV-003-0.json` | 13NV | 003 | 0 | All |
| `13NV-003-4.json` | 13NV | 003 | 4 | All |
| `13NV-003-4 CAP.json` | 13NV | 003 | 4 | CAP |
| `13NV-003-4 VAP.json` | 13NV | 003 | 4 | VAP |
| `13NV-165-0 CAP.json` | 13NV | 165 | 0 | CAP |

### Mock File Structure

```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 11,
  "entry": [
    {
      "fullUrl": "http://localhost:8080/fhir/ResearchSubject/3666",
      "resource": {
        "resourceType": "ResearchSubject",
        "id": "3666",
        "extension": [
          {
            "url": "http://vital.oucru.org/StructureDefinition/condition",
            "valueCodeableConcept": {
              "coding": [{ "code": "CAP" }],
              "text": "CAP"
            }
          }
        ],
        "status": "active",
        "progress": [
          {
            "type": { "coding": [{ "code": "state" }] },
            "subjectState": {
              "coding": [{ "code": "screening", "display": "Screening" }]
            },
            "startDate": "2026-01-06"
          },
          {
            "type": { "coding": [{ "code": "state" }] },
            "subjectState": {
              "coding": [{ "code": "on-study", "display": "On Study" }]
            },
            "startDate": "2026-01-07"
          }
        ],
        "study": { "reference": "ResearchStudy/Study13NV" },
        "subject": {
          "reference": "Patient/PatientExample",
          "identifier": [{ "value": "1" }],
          "name": [{ "given": ["N1"] }]
        }
      }
    }
  ]
}
```

---

## 4. Development vs Production Mode

### Mode Detection

**File:** `src/services/fhirService.js`

```javascript
const shouldUseMockData = () => {
  return FHIR_API_URL.includes('localhost');
};

const isDevelopmentMode = () => {
  return window.location.hostname === 'localhost';
};
```

### Behavior Comparison

| Feature | Development Mode | Production Mode |
|---------|------------------|-----------------|
| Data Source | Mock JSON files | Backend API |
| File Pattern | `{study}-{site}-{ward} {condition}.json` | API query params |
| Table Generation | From patient data | Direct from API |
| Chart Data | Generated | Direct from API |
| Site Filter | Via filename | API parameter |
| Ward Filter | Via filename | API parameter |
| Condition Filter | Via filename | API parameter |

### Smart Data Source Switching

The system uses `usingMockGeneration` flag to handle studies with/without mock data:

```javascript
// When switching studies
if (patients.length > 0) {
  // Mock data found - use generated tables
  setUsingMockGeneration(true);
} else {
  // No mock data - allow production API
  setUsingMockGeneration(false);
}
```

---

## 5. Component Integration

### Filter Components

| Component | File | Purpose |
|-----------|------|---------|
| `SiteSelection` | `src/components/filters/SiteSelection.jsx` | Site dropdown with alias filtering |
| `WardSelection` | `src/components/filters/WardSelection.jsx` | Ward dropdown with alias filtering |
| `ConditionFilter` | `src/components/filters/ConditionFilter.jsx` | Condition dropdown |

### Display Components

| Component | File | Data Source |
|-----------|------|-------------|
| `PatientDetailTable` | `src/components/tables/TrackingMonthlyPage/PatientDetailTable.jsx` | `patientData.patients` |
| `ScreeningTable` | `src/components/tables/TrackingMonthlyPage/ScreeningTable.jsx` | `recruitmentData.screeningData` |
| `RecruitmentTable` | `src/components/tables/TrackingMonthlyPage/RecruitmentTable.jsx` | `recruitmentData.studyData` |
| `renderRecruitmentChart` | `src/components/charts/TrackingStudyPage/TimelineChart.jsx` | `recruitmentData.studyData` |

### Timepoint Options

| Value | Display | Date Format | Example |
|-------|---------|-------------|---------|
| `daily` | Daily | `YYYY-MM-DD` | `2026-01-15` |
| `weekly` | Weekly | `YYYY-WNN` | `2026-W03` |
| `monthly` | Monthly | `YYYY-MM` | `2026-01` |
| `quarterly` | Quarterly | `YYYY-QN` | `2026-Q1` |
| `yearly` | Yearly | `YYYY` | `2026` |

---

## 6. API Specifications

### Current Implementation (Development Mode)

#### Mock File Loading

**Function:** `getRecruitmentDetail(filters)`
**File:** `src/services/fhirService.js:489-586`

```javascript
// Builds filename from filters
let filename = studyCode;
if (siteCode) filename += `-${siteCode}`;
if (wardCode) filename += `-${wardCode}`;
if (condition) filename += ` ${condition}`;
filename += '.json';

// Loads from: src/mockData/tracking/{filename}
const mockData = await import(`../mockData/tracking/${filename}`);
```

### Expected Production API Specifications

#### 1. Recruitment Detail API

**Endpoint:** `GET /api/recruitment-detail`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `studyCode` | string | ✅ Yes | Study code (e.g., "13NV") |
| `siteCode` | string | ❌ No | Site code (e.g., "003") |
| `wardCode` | string | ❌ No | Ward code (e.g., "4") |
| `condition` | string | ❌ No | Condition (e.g., "CAP", "VAP") |

**Response:** FHIR Bundle with ResearchSubject resources

---

#### 2. Study Tracking API

**Endpoint:** `GET /api/study-tracking`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | ✅ Yes | Aggregation: "daily", "weekly", "monthly", "quarterly", "yearly" |
| `limit` | number | ❌ No | Max records (default: 12) |
| `sort` | string | ❌ No | Sort order (default: "date DESC") |
| `end_date` | string | ❌ No | Filter up to date (YYYY-MM-DD) |
| `study` | string | ✅ Yes | Study code (e.g., "13NV") |
| `site` | string | ❌ No | Site code (e.g., "003") |
| `ward` | string | ❌ No | Ward code (e.g., "4") |
| `condition` | string | ❌ No | Condition (e.g., "CAP") |

**Response:**
```json
{
  "data": [
    {
      "date": "2026-W03",
      "recruited_number": 5,
      "cumulative_recruited": 10,
      "target": 50
    }
  ]
}
```

---

#### 3. Screening Summary API

**Endpoint:** `GET /api/screening-summary`

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | ✅ Yes | Aggregation period |
| `limit` | number | ❌ No | Max records |
| `sort` | string | ❌ No | Sort order |
| `end_date` | string | ❌ No | Filter up to date |
| `study` | string | ✅ Yes | Study code |
| `site` | string | ❌ No | Site code |
| `ward` | string | ❌ No | Ward code |
| `condition` | string | ❌ No | Condition |

**Response:**
```json
{
  "data": [
    {
      "date": "2026-01-15",
      "study": "13NV",
      "screening_summary": {
        "CAP": {
          "screened": 15,
          "eligible": 12,
          "enrolled": 10,
          "excluded": 3,
          "declined": 2
        },
        "VAP": {
          "screened": 8,
          "eligible": 6,
          "enrolled": 5,
          "excluded": 2,
          "declined": 1
        }
      }
    }
  ]
}
```

---

## 7. Backend TODO Items

### Search for TODO markers:

```bash
grep -rn "TODO REPLACE with BACKEND API" src/
```

### TODO Locations

#### File: `src/services/fhirService.js`

| Line | Function | Description |
|------|----------|-------------|
| 535-542 | `getRecruitmentDetail()` | Update FHIR query to backend API |
| 551-556 | `getRecruitmentDetail()` | Add site filter parameter |
| 560 | `getRecruitmentDetail()` | Verify ward filter parameter |
| 568 | `getRecruitmentDetail()` | Verify condition filter and codes |

#### File: `src/pages/Tracking/MonthlyReport.jsx`

| Line | Function | Description |
|------|----------|-------------|
| 118-129 | `fetchMonthlyData()` | Update getStudyTracking call |
| 136-139 | `fetchMonthlyData()` | Uncomment site/ward/condition params |
| 266-277 | `fetchScreeningData()` | Update getPeriodTotalScreening call |
| 284-287 | `fetchScreeningData()` | Uncomment site/ward/condition params |

#### File: `src/pages/Tracking/TrackingWeekly.jsx`

| Line | Function | Description |
|------|----------|-------------|
| 101-110 | `fetchWeeklyData()` | Update getPeriodTotalRecruitment call |
| 122-126 | `fetchWeeklyData()` | Uncomment site/ward/condition params |
| 184-198 | `fetchRecruitmentData()` | Update getStudyTracking call |
| 208-211 | `fetchRecruitmentData()` | Uncomment site/ward/condition params |
| 220-223 | `fetchRecruitmentData()` | Uncomment screening filter params |

### Implementation Checklist

- [ ] **Backend Team:**
  - [ ] Implement `/api/recruitment-detail` endpoint with site/ward/condition filters
  - [ ] Implement `/api/study-tracking` endpoint with hierarchical filters
  - [ ] Implement `/api/screening-summary` endpoint with hierarchical filters
  - [ ] Implement `/api/period-total-recruitment` endpoint with hierarchical filters
  - [ ] Document API response formats

- [ ] **Frontend Team (after backend ready):**
  - [ ] Remove mock data loading in `getRecruitmentDetail()`
  - [ ] Uncomment filter parameters in `MonthlyReport.jsx` - `fetchMonthlyData()`
  - [ ] Uncomment filter parameters in `MonthlyReport.jsx` - `fetchScreeningData()`
  - [ ] Uncomment filter parameters in `TrackingWeekly.jsx` - `fetchWeeklyData()`
  - [ ] Uncomment filter parameters in `TrackingWeekly.jsx` - `fetchRecruitmentData()`
  - [ ] Test all filter combinations on both pages
  - [ ] Remove `usingMockGeneration` flag logic

---

## 8. Testing Guide

### Development Mode Test Cases

#### Test 1: Study Only Filter

**Steps:**
1. Select Study: `13NV`
2. Leave Site, Ward, Condition as "All"

**Expected:**
- Mock file loaded: `13NV.json`
- Console: `[FHIR Service] Loading recruitment detail from MOCK file: 13NV.json`
- All tables show data for entire study

---

#### Test 2: Study + Site Filter

**Steps:**
1. Select Study: `13NV`
2. Select Site: `Hospital for Tropical Diseases (003)`

**Expected:**
- Mock file loaded: `13NV-003.json`
- Console: `[FHIR Service] Loading recruitment detail from MOCK file: 13NV-003.json`
- Tables filtered to site 003 data

---

#### Test 3: Study + Site + Ward Filter

**Steps:**
1. Select Study: `13NV`
2. Select Site: `Hospital for Tropical Diseases (003)`
3. Select Ward: `Ward 4`

**Expected:**
- Mock file loaded: `13NV-003-4.json`
- Console: `[FHIR Service] Loading recruitment detail from MOCK file: 13NV-003-4.json`
- Tables filtered to ward 4 data

---

#### Test 4: Full Filter (Study + Site + Ward + Condition)

**Steps:**
1. Select Study: `13NV`
2. Select Site: `Hospital for Tropical Diseases (003)`
3. Select Ward: `Ward 4`
4. Select Condition: `CAP`

**Expected:**
- Mock file loaded: `13NV-003-4 CAP.json`
- Console: `[FHIR Service] Loading recruitment detail from MOCK file: 13NV-003-4 CAP.json`
- Tables filtered to CAP condition only

---

#### Test 5: Timepoint Changes

**Steps:**
1. Select Study: `13NV`
2. Change Timepoint: Daily → Weekly → Monthly → Quarterly → Yearly

**Expected:**
- Chart title changes (e.g., "Weekly Recruitment Progress")
- Table date column format changes
- Data re-aggregates appropriately

---

#### Test 6: Production API Study (54EI)

**Steps:**
1. Select Study: `54EI` (no mock file exists)

**Expected:**
- Console: `[MonthlyReport] No patient data available, allowing API to populate tables`
- Tables show data from production API
- Chart displays API data

---

### Console Log Reference

**Successful Mock Load:**
```
[FHIR Service] Loading recruitment detail from MOCK file: 13NV-003-4.json
[FHIR Service] Filters: {studyCode: '13NV', siteCode: '003', wardCode: '4', condition: null}
[FHIR Service] Successfully loaded 5 patients from mock data
[MonthlyReport] Loaded 5 patients
[MonthlyReport] Development mode: Generating screening summary and recruitment details from patient data
```

**No Mock File (Fallback to API):**
```
[FHIR Service] Loading recruitment detail from MOCK file: 54EI.json
[FHIR Service] Mock file not found: 54EI.json
[FHIR Service] Returning empty bundle
[MonthlyReport] No patient data available, allowing API to populate tables
[fetchMonthlyData] Using API data, updating studyData and totalMonthly
```

---

## 9. File Reference

### Core Files

| File | Purpose |
|------|---------|
| `src/services/fhirService.js` | Data fetching and processing |
| `src/pages/Tracking/MonthlyReport.jsx` | Monthly report page with filters |
| `src/pages/Tracking/TrackingWeekly.jsx` | Weekly tracking page with filters |
| `src/store/studySlice.js` | Redux state management |

### Filter Components

| File | Purpose |
|------|---------|
| `src/components/filters/SiteSelection.jsx` | Site dropdown |
| `src/components/filters/WardSelection.jsx` | Ward dropdown |
| `src/components/filters/ConditionFilter.jsx` | Condition dropdown |

### Display Components (Monthly Page)

| File | Purpose |
|------|---------|
| `src/components/tables/TrackingMonthlyPage/PatientDetailTable.jsx` | Patient list |
| `src/components/tables/TrackingMonthlyPage/ScreeningTable.jsx` | Screening summary |
| `src/components/tables/TrackingMonthlyPage/RecruitmentTable.jsx` | Recruitment details |
| `src/components/charts/TrackingStudyPage/TimelineChart.jsx` | Recruitment chart |

### Display Components (Weekly Page)

| File | Purpose |
|------|---------|
| `src/components/cards/TrackingWeeklyPage/WeeklyRecruitmentCard.jsx` | Weekly summary cards |
| `src/components/tables/TrackingWeeklyPage/RecruitmentTable.jsx` | Weekly recruitment table |
| `src/components/charts/TrackingWeeklyPage/StudyTimeline.jsx` | Study timeline chart |

### Mock Data

| File | Purpose |
|------|---------|
| `src/mockData/tracking/*.json` | Mock patient data |
| `data/Mock/fhir/getOrganizationSite.json` | Mock site data |
| `data/Mock/fhir/getOrganizationWard.json` | Mock ward data |
| `data/Mock/fhir/getResearchStudy.json` | Mock study data |

### Documentation Files

| File | Purpose |
|------|---------|
| `FILTER_IMPLEMENTATION_REPORT.md` | This document |
| `TIMEPOINT_AGGREGATION_IMPLEMENTATION.md` | Timepoint feature |
| `LIVE_FILTER_UPDATES.md` | Real-time updates |
| `MIXED_MODE_DATA_SOURCES_FIX.md` | Data source switching |
| `RECRUITMENT_CHART_CONCURRENT_UPDATE_FIX.md` | Chart fixes |
| `WEEKLY_CHART_DATE_COMPARISON_FIX.md` | Weekly display fix |

---

## Appendix: Quick Reference

### Filter Dropdown → Mock File Mapping

```
Study: 13NV                           → 13NV.json
Study: 13NV + Site: 003              → 13NV-003.json
Study: 13NV + Site: 003 + Ward: 0    → 13NV-003-0.json
Study: 13NV + Site: 003 + Ward: 4    → 13NV-003-4.json
Study: 13NV + Site: 003 + Ward: 4 + CAP → 13NV-003-4 CAP.json
Study: 13NV + Site: 003 + Ward: 4 + VAP → 13NV-003-4 VAP.json
```

### Site Code Reference (Study 13NV)

| Site Code | Hospital Name |
|-----------|---------------|
| 003 | Hospital for Tropical Diseases |
| 020 | National Hospital for Tropical Diseases |
| 165 | Nguyen Thi Thap Hospital |
| 103 | Trung Vuong Hospital |

### Ward Code Reference (Site 003)

| Ward Code | Ward Name |
|-----------|-----------|
| 0 | Ward 0 |
| 4 | Ward 4 |

---

**Document Version:** 1.0
**Last Updated:** 2026-01-15
**Author:** Development Team
