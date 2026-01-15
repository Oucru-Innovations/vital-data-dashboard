# Recruitment Detail Implementation Report

**Date:** 2026-01-13
**Feature:** Patient-Level Recruitment Detail Tracking
**Study:** 13NV - Community Acquired Pneumonia Study
**Status:** ✅ COMPLETED

---

## Executive Summary

Successfully implemented patient-level recruitment detail tracking for the Monthly Report page. The implementation includes:

1. **Backend Service Functions** - FHIR-compliant data loading with mock data support
2. **UI Components** - Interactive patient detail table with expandable timelines
3. **Filter Integration** - Complete filtering by study, site, ward, and condition (CAP/VAP)
4. **State Management** - Redux integration for condition filtering
5. **Environment Switching** - Automatic mock data in development, FHIR API in production

---

## Table of Contents

1. [Implementation Overview](#implementation-overview)
2. [Files Created/Modified](#files-createdmodified)
3. [Architecture](#architecture)
4. [Key Features](#key-features)
5. [Data Flow](#data-flow)
6. [Testing Guide](#testing-guide)
7. [Future Enhancements](#future-enhancements)

---

## Implementation Overview

### Problem Statement

The Monthly Report page needed to display patient-level recruitment details showing:
- Individual patient screening records
- Patient journey through study stages (screening → eligible → enrolled)
- Filtering by condition (CAP vs VAP)
- Status tracking with reasons for non-enrollment

### Solution

Implemented a complete patient detail system using:
- FHIR ResearchSubject resources for patient data
- Mock data files for development (study 13NV prepared)
- Redux state management for filter coordination
- Material-UI components for interactive tables

---

## Files Created/Modified

### Files Created

#### 1. `src/components/filters/ConditionFilter.jsx` (231 lines)
**Purpose:** Dropdown filter for selecting patient condition (CAP/VAP)

**Key Features:**
- Redux-integrated state management
- Three options: All Conditions, CAP, VAP
- Color-coded chips (primary/secondary)
- Full condition names displayed
- SNOMED codes shown in descriptions
- Custom render with condition badges

**Redux Integration:**
```javascript
import { selectCurrentCondition, setCurrentCondition, clearCurrentCondition } from '../../store/studySlice';
```

**Usage:**
```jsx
<ConditionFilter size="medium" showLabel={true} />
```

---

#### 2. `src/components/tables/TrackingMonthlyPage/PatientDetailTable.jsx` (468 lines)
**Purpose:** Display patient list with expandable journey timelines

**Key Features:**
- **Sortable Columns:** Click headers to sort by any field
- **Expandable Rows:** Click arrow to reveal patient journey timeline
- **Status Color Coding:**
  - 🟢 Green: Enrolled (on-study)
  - 🔵 Blue: Eligible
  - 🟡 Yellow: Screening
  - 🔴 Red: Not Registered
  - ⚫ Gray: Retired
- **Condition Badges:** CAP/VAP chips with colors
- **Study ID Display:** Shows enrollment ID for enrolled patients
- **Reason Tooltips:** Full reason text on hover
- **Empty State:** Helpful message when no patients found
- **Loading State:** Spinner during data fetch

**Columns:**
1. Expand button
2. Screening ID
3. Name
4. Condition (with multiple groups if applicable)
5. Current Status
6. Start Date
7. Last Update
8. Study ID (if enrolled)
9. Reason (if not enrolled)

**Timeline Features:**
- Step numbers (1, 2, 3...)
- Status badge at each step
- Date of status change
- Reason text
- Current step highlighted

**Usage:**
```jsx
<PatientDetailTable
  patients={patientData.patients}
  loading={patientData.loading}
  onRefresh={() => fetchRecruitmentDetail()}
/>
```

---

#### 3. `src/mockData/tracking/*.json` (7 files)
**Purpose:** Mock data for development testing

**Files Copied:**
- `13NV.json` - All patients for study 13NV
- `13NV-003.json` - Patients at site 003 (Hospital for Tropical Diseases)
- `13NV-003-0.json` - Patients at ward 0
- `13NV-003-4.json` - Patients at ward 4
- `13NV-003-4 CAP.json` - Ward 4, CAP patients only
- `13NV-003-4 VAP.json` - Ward 4, VAP patients only
- `13NV-165-0 CAP.json` - Example from different site

**File Naming Pattern:**
```
{studyCode}-{siteCode}-{wardCode} {condition}.json

Examples:
- "13NV.json" → Study only
- "13NV-003.json" → Study + site
- "13NV-003-4.json" → Study + site + ward
- "13NV-003-4 CAP.json" → Study + site + ward + condition
```

---

### Files Modified

#### 1. `src/services/fhirService.js`
**Lines Added:** 433-806 (374 lines with extensive comments)

**Functions Added:**

##### `getRecruitmentDetail(filters)` (Lines 433-569)
**Purpose:** Fetch recruitment detail data from mock files or FHIR API

**Parameters:**
```javascript
{
  studyCode: "13NV",      // Required
  siteCode: "003",        // Optional
  wardCode: "4",          // Optional
  condition: "CAP"        // Optional
}
```

**Development Mode Behavior:**
- Builds filename from filters: `13NV-003-4 CAP.json`
- Loads from `src/mockData/tracking/`
- Returns FHIR Bundle or empty bundle if file not found

**Production Mode Behavior:**
- Calls FHIR API: `GET /ResearchSubject?study={study}&_include=ResearchSubject:subject`
- Adds filters for site, ward, condition
- Returns FHIR Bundle from server

**Example:**
```javascript
const bundle = await getRecruitmentDetail({
  studyCode: "13NV",
  siteCode: "003",
  wardCode: "4",
  condition: "CAP"
});
// Loads: 13NV-003-4 CAP.json in dev
```

---

##### `preprocessRecruitmentDetail(bundle)` (Lines 571-730)
**Purpose:** Transform FHIR Bundle into patient summary objects

**Input:** FHIR Bundle with ResearchSubject entries

**Output:** Array of patient objects:
```javascript
{
  id: "3666",
  screeningId: "1",
  name: "N1",
  birthYear: "2001",
  condition: "CAP",
  groups: ["CAP"],
  currentStatus: "on-study",
  statusText: "Enrolled",
  reason: "enrolled",
  startDate: "2026-01-11",
  lastUpdate: "2026-01-11",
  studyId: "13NV-165-0002-C",
  ward: "WardNTTHED",
  progress: [...]
}
```

**Processing Steps:**
1. Extract condition from FHIR extension
2. Extract comparison groups from extensions
3. Get latest status from progress array
4. Map status code to display text
5. Extract patient identifiers
6. Get linked patient for study ID
7. Build complete patient object

**Status Mapping:**
```javascript
{
  'screening': 'Screening',
  'eligible': 'Eligible',
  'on-study': 'Enrolled',
  'not-registered': 'Not Registered',
  'retired': 'Retired'
}
```

---

##### `getProcessedRecruitmentDetail(filters)` (Lines 732-758)
**Purpose:** Convenience wrapper combining fetch and preprocess

**Example:**
```javascript
const patients = await getProcessedRecruitmentDetail({
  studyCode: "13NV",
  siteCode: "003",
  condition: "CAP"
});
console.log(patients.length); // 3 patients
```

---

##### `calculateMonthlyStats(patients)` (Lines 760-786)
**Purpose:** Calculate monthly recruitment statistics from patient array

**Output:** Array of monthly statistics:
```javascript
[
  {
    month: "2026-01",
    screened: 6,
    eligible: 3,
    enrolled: 2,
    notRegistered: 3,
    successRate: 33.3
  },
  {
    month: "2026-02",
    screened: 4,
    eligible: 2,
    enrolled: 1,
    notRegistered: 1,
    successRate: 25.0
  }
]
```

**Processing:**
- Groups patients by month from first progress date
- Counts patients at each status level
- Calculates enrollment success rate
- Sorts chronologically

---

##### `groupPatientsByStatus(patients)` (Lines 788-806)
**Purpose:** Group patients by current status for summary cards

**Output:**
```javascript
{
  screening: [patient1, patient2],
  eligible: [patient3],
  enrolled: [patient4, patient5],
  notRegistered: [patient6, patient7, patient8],
  retired: []
}
```

---

#### 2. `src/components/filters/index.js`
**Lines Modified:** Added ConditionFilter export

**Before:**
```javascript
export { default as SiteSelection } from './SiteSelection';
export { default as WardSelection } from './WardSelection';
```

**After:**
```javascript
export { default as SiteSelection } from './SiteSelection';
export { default as WardSelection } from './WardSelection';
export { default as ConditionFilter } from './ConditionFilter';
```

---

#### 3. `src/pages/Tracking/MonthlyReport.jsx`
**Lines Modified:** Multiple sections

##### Imports Added (Lines 30-45)
```javascript
import { SiteSelection, WardSelection, ConditionFilter } from '../../components/filters';
import PatientDetailTable from '../../components/tables/TrackingMonthlyPage/PatientDetailTable';
import {
  // ... existing imports
  selectCurrentCondition,
} from '../../store/studySlice';
import {
  getProcessedStudies,
  getProcessedRecruitmentDetail,
  calculateMonthlyStats,
  isDevelopmentMode,
} from '../../services/fhirService';
```

---

##### State Added (Lines 55-72)
```javascript
// Redux selector for condition filter
const currentCondition = useSelector(selectCurrentCondition);

// Local state for patient detail data
const [patientData, setPatientData] = useState({
  patients: [],
  monthlyStats: [],
  loading: false
});
```

---

##### Function Added: `fetchRecruitmentDetail()` (Lines 396-453)
**Purpose:** Fetch patient-level recruitment detail with full filtering

**Features:**
- Only fetches when study is selected
- Builds filter object from Redux state
- Logs filter values for debugging
- Processes FHIR data into patient objects
- Calculates monthly statistics
- Handles errors gracefully
- Sets loading state

**Filter Hierarchy:**
```
Study (REQUIRED) → Site (OPTIONAL) → Ward (OPTIONAL) → Condition (OPTIONAL)
```

**Example Flow:**
1. User selects "13NV" → Loads all 13NV patients
2. User selects site "003" → Reloads with 13NV-003 patients
3. User selects ward "4" → Reloads with 13NV-003-4 patients
4. User selects condition "CAP" → Reloads with 13NV-003-4 CAP patients

---

##### useEffect Added (Lines 518-520)
**Purpose:** Trigger data fetch when filters change

```javascript
useEffect(() => {
  fetchRecruitmentDetail();
}, [selectedStudy, currentSite, currentWard, currentCondition]);
```

**Dependencies:**
- `selectedStudy` - Study code (e.g., "13NV")
- `currentSite` - Redux site object
- `currentWard` - Redux ward object
- `currentCondition` - Redux condition string ("CAP"/"VAP")

---

##### UI Components Added

**Condition Filter in Grid (Lines 672-681):**
```jsx
<Grid item xs={12} md={3}>
  <ConditionFilter size="medium" showLabel={true} sx={{ width: '100%' }} />
</Grid>
```

**Patient Detail Table (Lines 792-801):**
```jsx
{selectedStudy && (
  <Box sx={{ mt: 4 }}>
    <Divider sx={{ mb: 3 }} />
    <PatientDetailTable
      patients={patientData.patients}
      loading={patientData.loading}
      onRefresh={fetchRecruitmentDetail}
    />
  </Box>
)}
```

**Conditional Rendering:**
- Only shows when study is selected
- Prevents empty table display
- Passes loading state to table
- Provides refresh callback

---

## Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    MonthlyReport Page                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Interactions:                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │Select Study │→│ Select Site │→│ Select Ward │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│         ↓                                                   │
│  ┌─────────────────────────────────────────┐              │
│  │ Select Condition (CAP/VAP/All)         │              │
│  └─────────────────────────────────────────┘              │
│                                                             │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                    Redux Store (studySlice)                 │
├─────────────────────────────────────────────────────────────┤
│  State:                                                     │
│  • currentStudy: { id, name, studyCode, ... }             │
│  • currentSite: { code, name, aliases, ... }              │
│  • currentWard: { code, name, aliases, ... }              │
│  • currentCondition: "CAP" | "VAP" | null                 │
│  • alias: "13NV-003-4" (computed from above)              │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│              useEffect Trigger (Filter Change)              │
├─────────────────────────────────────────────────────────────┤
│  Dependencies: [selectedStudy, currentSite,                │
│                 currentWard, currentCondition]             │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│            fetchRecruitmentDetail() Function                │
├─────────────────────────────────────────────────────────────┤
│  1. Check if study selected (required)                     │
│  2. Build filters object:                                  │
│     {                                                       │
│       studyCode: "13NV",                                   │
│       siteCode: "003",                                     │
│       wardCode: "4",                                       │
│       condition: "CAP"                                     │
│     }                                                       │
│  3. Call getProcessedRecruitmentDetail(filters)           │
│  4. Calculate monthly stats                                │
│  5. Update local state                                     │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│            fhirService.js Processing                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Environment Check:                                         │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │ Development Mode │         │ Production Mode  │        │
│  └────────┬─────────┘         └────────┬─────────┘        │
│           ↓                            ↓                   │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │ Build filename:  │         │ Call FHIR API:   │        │
│  │ "13NV-003-4      │         │ GET /Research    │        │
│  │  CAP.json"       │         │ Subject?...      │        │
│  └────────┬─────────┘         └────────┬─────────┘        │
│           ↓                            ↓                   │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │ Load from:       │         │ Fetch from:      │        │
│  │ src/mockData/    │         │ FHIR Server      │        │
│  │ tracking/        │         │                  │        │
│  └────────┬─────────┘         └────────┬─────────┘        │
│           └────────────┬────────────────┘                  │
│                        ↓                                   │
│           ┌────────────────────────┐                      │
│           │ FHIR Bundle Response   │                      │
│           │ (ResearchSubject[])    │                      │
│           └────────────┬───────────┘                      │
│                        ↓                                   │
│           ┌────────────────────────┐                      │
│           │ preprocessRecruitment  │                      │
│           │ Detail()               │                      │
│           │ • Extract condition    │                      │
│           │ • Get latest status    │                      │
│           │ • Map to display text  │                      │
│           │ • Build patient object │                      │
│           └────────────┬───────────┘                      │
│                        ↓                                   │
│           ┌────────────────────────┐                      │
│           │ Patient Objects Array  │                      │
│           │ [{id, name, status,    │                      │
│           │   condition, ...}]     │                      │
│           └────────────┬───────────┘                      │
│                        ↓                                   │
│           ┌────────────────────────┐                      │
│           │ calculateMonthlyStats()│                      │
│           │ • Group by month       │                      │
│           │ • Count by status      │                      │
│           │ • Calculate success %  │                      │
│           └────────────┬───────────┘                      │
│                        ↓                                   │
│           ┌────────────────────────┐                      │
│           │ Return to Component    │                      │
│           └────────────────────────┘                      │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                Update Component State                        │
├─────────────────────────────────────────────────────────────┤
│  setPatientData({                                          │
│    patients: [...],    // 6 patients                       │
│    monthlyStats: [...], // Monthly aggregations            │
│    loading: false                                          │
│  })                                                         │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                  PatientDetailTable Render                  │
├─────────────────────────────────────────────────────────────┤
│  • Display patient rows                                     │
│  • Show condition badges                                    │
│  • Color-code status                                        │
│  • Expandable timeline                                      │
│  • Sort/filter controls                                     │
└─────────────────────────────────────────────────────────────┘
```

---

### Component Hierarchy

```
MonthlyReport
├── Filter Controls (Grid)
│   ├── Study Selection (FormControl)
│   ├── SiteSelection (Redux component)
│   ├── WardSelection (Redux component)
│   ├── ConditionFilter (Redux component) ← NEW
│   ├── Timepoint Selection (FormControl)
│   └── End Date Picker (DatePicker)
│
├── Monthly Cards
│   └── MonthlyRecruitmentCard × N
│
├── Charts
│   └── renderRecruitmentChart
│
├── Tables
│   ├── ScreeningTable
│   ├── RecruitmentTable
│   └── StudyTimeline
│
├── Patient Detail Section ← NEW
│   └── PatientDetailTable
│       └── PatientRow × N
│           ├── Main Row (Summary)
│           │   ├── Expand Button
│           │   ├── Screening ID
│           │   ├── Name
│           │   ├── Condition Chip
│           │   ├── Status Chip
│           │   ├── Dates
│           │   ├── Study ID
│           │   └── Reason
│           └── Expandable Row (Timeline)
│               └── Progress Steps
│                   └── Step × N
│                       ├── Step Number
│                       ├── Status Badge
│                       ├── Date
│                       └── Reason
│
└── Footer
```

---

## Key Features

### 1. Complete Filter Hierarchy

**Study → Site → Ward → Condition**

Each level filters the data progressively:

```javascript
// Example: Drill down from study to specific patients
"13NV"                    → All study patients (50+)
"13NV" + Site "003"       → Hospital patients (20)
"13NV-003" + Ward "4"     → Specific ward (10)
"13NV-003-4" + "CAP"      → CAP patients only (6)
```

---

### 2. Environment-Based Data Loading

**Development Mode (localhost):**
- Uses mock JSON files from `src/mockData/tracking/`
- File naming: `{study}-{site}-{ward} {condition}.json`
- Instant loading, no network calls
- Perfect for testing UI without backend

**Production Mode:**
- Calls FHIR API endpoints
- Real-time data from database
- Same data structure as mock files
- Seamless transition from dev to prod

**Detection Logic:**
```javascript
function isDevelopmentMode() {
  return window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
}
```

---

### 3. Patient Journey Timeline

Each patient has a `progress` array tracking their status over time:

**Example Timeline:**
```
Patient N2:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Screening   │ → │  Enrolled   │ → │  Eligible   │
│ 2026-01-10  │    │ 2026-01-10  │    │ 2026-01-11  │
└─────────────┘    └─────────────┘    └─────────────┘
                   Study ID:
                   13NV-165-0001-C
```

**Visual Representation:**
- Step numbers (1, 2, 3)
- Color-coded status badges
- Dates at each transition
- Reason text (if provided)
- Current step highlighted

---

### 4. Status Color Coding

**Color Scheme:**
```
🟢 Green (success)  → on-study (Enrolled)
🔵 Blue (info)      → eligible (Eligible to enroll)
🟡 Yellow (warning) → screening (Being screened)
🔴 Red (error)      → not-registered (Not enrolled)
⚫ Gray (default)   → retired (Withdrawn/Completed)
```

**Consistent Across:**
- Main status column
- Timeline progress badges
- Condition chips (CAP=primary, VAP=secondary)

---

### 5. Smart Empty States

**No Study Selected:**
- Patient table hidden completely
- Avoids showing empty/confusing state

**No Patients Found:**
- Helpful message displayed
- Suggests adjusting filters
- Shows current filter combination

**Loading State:**
- Spinner animation
- "Loading patient data..." text
- Prevents UI jumps

---

### 6. Sortable Columns

Click any column header to sort:
- **Screening ID:** Alphabetical
- **Name:** Alphabetical
- **Condition:** Alphabetical (CAP before VAP)
- **Status:** Alphabetical
- **Start Date:** Chronological
- **Last Update:** Chronological
- **Study ID:** Alphabetical

**Sort Direction:**
- First click: Ascending
- Second click: Descending
- Third click: Back to ascending

**Visual Indicator:**
- Active column highlighted
- Arrow icon shows direction
- Smooth transitions

---

### 7. Condition Badges

**Display Format:**
```
┌──────────────────────────────┐
│ [CAP] Community Acquired     │
│       Pneumonia              │
│                              │
│ Description: Pneumonia       │
│ acquired outside hospital    │
│                              │
│ SNOMED: 385093006           │
└──────────────────────────────┘
```

**Features:**
- Color-coded chips (CAP=blue, VAP=purple)
- Full condition name shown
- Medical description
- SNOMED CT code reference
- Multiple groups per patient supported

---

### 8. Refresh Capability

**Refresh Button:**
- Located in table header
- Icon button with refresh icon
- Disabled during loading
- Re-fetches data with current filters

**Auto-Refresh Triggers:**
- Study selection changes
- Site selection changes
- Ward selection changes
- Condition selection changes

---

## Data Flow

### 1. Filter Selection Flow

```
User Action                Redux State Update           Data Fetch Trigger
───────────────────────────────────────────────────────────────────────────

Select "13NV"     →    currentStudy = {             →  fetchRecruitmentDetail()
                       id: "Study13NV",                 with filters:
                       studyCode: "13NV"                { studyCode: "13NV" }
                     }
                     currentSite = null
                     currentWard = null
                     ↓
Select Site       →    currentSite = {              →  fetchRecruitmentDetail()
"003"                  code: "003",                     with filters:
                       name: "Hospital..."              { studyCode: "13NV",
                     }                                    siteCode: "003" }
                     currentWard = null
                     ↓
Select Ward       →    currentWard = {              →  fetchRecruitmentDetail()
"4"                    code: "4",                       with filters:
                       name: "Ward 4"                   { studyCode: "13NV",
                     }                                    siteCode: "003",
                     ↓                                    wardCode: "4" }

Select Condition  →    currentCondition = "CAP"     →  fetchRecruitmentDetail()
"CAP"                                                   with filters:
                                                        { studyCode: "13NV",
                                                          siteCode: "003",
                                                          wardCode: "4",
                                                          condition: "CAP" }
```

---

### 2. Data Processing Flow

```
FHIR Bundle Input
─────────────────
{
  "resourceType": "Bundle",
  "entry": [{
    "resource": {
      "resourceType": "ResearchSubject",
      "id": "3666",
      "extension": [
        { "url": ".../condition", "valueCodeableConcept": { "text": "CAP" } },
        { "url": ".../comparisonGroup", "valueId": "CAP" }
      ],
      "progress": [
        { "subjectState": { "coding": [{"code": "screening"}] }, "startDate": "2026-01-11" },
        { "subjectState": { "coding": [{"code": "on-study"}] }, "startDate": "2026-01-11", "reason": { "text": "enrolled" } }
      ],
      "subject": {
        "identifier": [{ "value": "1" }],
        "name": [{ "given": ["N1"] }],
        "birthDate": "2001",
        "managingOrganization": { "reference": "Organization/WardNTTHED" },
        "link": [{ "other": { "name": [{ "given": ["13NV-165-0002-C"] }] } }]
      }
    }
  }]
}

↓ preprocessRecruitmentDetail()

Patient Object Output
────────────────────
{
  id: "3666",
  screeningId: "1",
  name: "N1",
  birthYear: "2001",
  condition: "CAP",
  groups: ["CAP"],
  currentStatus: "on-study",
  statusText: "Enrolled",
  reason: "enrolled",
  startDate: "2026-01-11",
  lastUpdate: "2026-01-11",
  studyId: "13NV-165-0002-C",
  ward: "WardNTTHED",
  progress: [
    {
      subjectState: { coding: [{code: "screening"}], text: "Screening" },
      startDate: "2026-01-11"
    },
    {
      subjectState: { coding: [{code: "on-study"}], text: "Enrolled" },
      startDate: "2026-01-11",
      reason: { text: "enrolled" }
    }
  ]
}

↓ PatientDetailTable Rendering

UI Display
──────────
┌────────────────────────────────────────────────────────────────┐
│ [▼] │ 1 │ N1 │ [CAP] │ [Enrolled] │ 2026-01-11 │ ... │ 13NV...│
├────────────────────────────────────────────────────────────────┤
│     Patient Journey Timeline                                   │
│     ┌─────────────────────────────────────────────────────────┐│
│     │ [1] [Screening] 2026-01-11                     │        ││
│     │ [2] [Enrolled]  2026-01-11 → enrolled  [CURRENT]        ││
│     └─────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

---

### 3. Monthly Statistics Flow

```
Patient Array Input
──────────────────
[
  { id: 1, startDate: "2026-01-09", currentStatus: "not-registered" },
  { id: 2, startDate: "2026-01-10", currentStatus: "on-study" },
  { id: 3, startDate: "2026-01-11", currentStatus: "on-study" },
  { id: 4, startDate: "2026-01-11", currentStatus: "eligible" },
  { id: 5, startDate: "2026-01-11", currentStatus: "not-registered" },
  { id: 6, startDate: "2026-01-11", currentStatus: "not-registered" }
]

↓ calculateMonthlyStats()

Group by month (from startDate)
───────────────────────────────
2026-01: [patient1, patient2, patient3, patient4, patient5, patient6]

Count by status
──────────────
Screened: 6 (all entered screening)
Eligible: 1 (patient4)
Enrolled: 2 (patient2, patient3)
Not Registered: 3 (patient1, patient5, patient6)

Calculate success rate
─────────────────────
Success Rate = (Enrolled / Screened) × 100 = (2 / 6) × 100 = 33.3%

Monthly Stats Output
───────────────────
[
  {
    month: "2026-01",
    screened: 6,
    eligible: 1,
    enrolled: 2,
    notRegistered: 3,
    successRate: 33.3
  }
]
```

---

## Testing Guide

### Prerequisites

1. **Development Environment:**
   ```bash
   cd vital-data-dashboard
   npm install
   npm start
   ```

2. **Verify Mock Data:**
   ```bash
   ls src/mockData/tracking/
   # Should show: 13NV.json, 13NV-003.json, etc.
   ```

3. **Check Redux Store:**
   - Install Redux DevTools Extension
   - Open browser console → Redux tab

---

### Test Scenarios

#### Test 1: Basic Patient Display

**Steps:**
1. Navigate to Monthly Report page
2. Select study "13NV" from dropdown
3. Wait for data to load

**Expected Results:**
- ✅ Study dropdown shows "13NV - [Study Name]"
- ✅ Site dropdown becomes enabled
- ✅ Patient Detail table appears below existing tables
- ✅ Table shows "Patient Detail (N patients)" header
- ✅ Patients displayed in sortable table
- ✅ Each row shows: screening ID, name, condition, status, dates

**Mock File Loaded:** `13NV.json` (all study patients)

---

#### Test 2: Site Filtering

**Steps:**
1. Select study "13NV"
2. Select site "003 - Hospital for Tropical Diseases"
3. Wait for reload

**Expected Results:**
- ✅ URL/console shows: Loading with filters: { studyCode: "13NV", siteCode: "003" }
- ✅ Ward dropdown becomes enabled
- ✅ Patient count updates
- ✅ Only site 003 patients shown

**Mock File Loaded:** `13NV-003.json`

---

#### Test 3: Ward Filtering

**Steps:**
1. Select study "13NV"
2. Select site "003"
3. Select ward "4" (or "0")
4. Wait for reload

**Expected Results:**
- ✅ Console shows: Loading with filters: { studyCode: "13NV", siteCode: "003", wardCode: "4" }
- ✅ Patient count updates to ward-specific number
- ✅ Condition filter becomes useful (multiple conditions in ward)

**Mock File Loaded:** `13NV-003-4.json` or `13NV-003-0.json`

---

#### Test 4: Condition Filtering (CAP)

**Steps:**
1. Select study "13NV", site "003", ward "4"
2. Select condition "CAP" from condition filter
3. Wait for reload

**Expected Results:**
- ✅ Console shows: condition: "CAP"
- ✅ Only CAP patients displayed
- ✅ Condition column shows only "CAP" badges
- ✅ Patient count matches CAP-only count

**Mock File Loaded:** `13NV-003-4 CAP.json`

---

#### Test 5: Condition Filtering (VAP)

**Steps:**
1. Keep study "13NV", site "003", ward "4"
2. Change condition to "VAP"
3. Wait for reload

**Expected Results:**
- ✅ Only VAP patients displayed
- ✅ Condition column shows only "VAP" badges (secondary color)
- ✅ Different patient set than CAP

**Mock File Loaded:** `13NV-003-4 VAP.json`

---

#### Test 6: Clear Condition Filter

**Steps:**
1. Keep filters: study "13NV", site "003", ward "4", condition "CAP"
2. Select "All Conditions" from condition filter
3. Wait for reload

**Expected Results:**
- ✅ Console shows: condition: null
- ✅ All patients shown (both CAP and VAP)
- ✅ Patient count increases
- ✅ Condition column shows mix of CAP/VAP badges

**Mock File Loaded:** `13NV-003-4.json`

---

#### Test 7: Expandable Timeline

**Steps:**
1. Have some patients displayed
2. Click expand arrow (▼) on any patient row

**Expected Results:**
- ✅ Row expands smoothly
- ✅ Timeline section appears below patient data
- ✅ "Patient Journey Timeline" header shown
- ✅ Progress steps displayed with:
  - Step numbers (1, 2, 3...)
  - Status badges with colors
  - Dates for each step
  - Reason text (if available)
- ✅ Current/latest step highlighted
- ✅ Arrow icon changes to ▲

**Example Timeline:**
```
[1] [Screening]  2026-01-11
[2] [Enrolled]   2026-01-11 → enrolled  [CURRENT]
```

---

#### Test 8: Column Sorting

**Steps:**
1. Click "Screening ID" header
2. Click again
3. Click "Name" header
4. Click "Status" header

**Expected Results:**
- ✅ First click: Sort ascending (A→Z or 1→9)
- ✅ Second click: Sort descending (Z→A or 9→1)
- ✅ Arrow icon shows sort direction
- ✅ Active column highlighted
- ✅ Patient order changes accordingly
- ✅ Smooth animations

---

#### Test 9: Status Color Coding

**Steps:**
1. Display patients with varied statuses
2. Observe status column and timeline badges

**Expected Results:**
- ✅ Enrolled (on-study): Green badge
- ✅ Eligible: Blue badge
- ✅ Screening: Yellow badge
- ✅ Not Registered: Red badge
- ✅ Retired: Gray badge
- ✅ Colors consistent in table and timeline

---

#### Test 10: Study ID Display

**Steps:**
1. Look at patients with "Enrolled" status
2. Check Study ID column

**Expected Results:**
- ✅ Enrolled patients show study ID (e.g., "13NV-165-0002-C")
- ✅ Study ID in green color (success.main)
- ✅ Tooltip shows "Enrolled - Study ID assigned"
- ✅ Non-enrolled patients show "-" in gray

---

#### Test 11: Reason Display

**Steps:**
1. Look at patients with "Not Registered" status
2. Check Reason column
3. Hover over reason text

**Expected Results:**
- ✅ Reason text shown (e.g., "No INC #3", "Declined")
- ✅ Long reasons truncated with ellipsis
- ✅ Tooltip shows full reason text on hover
- ✅ Patients without reason show "-"

---

#### Test 12: Empty State

**Steps:**
1. Select filters that return no patients (e.g., invalid combination)
2. Wait for load to complete

**Expected Results:**
- ✅ No patient rows shown
- ✅ Empty state message displayed:
  - "No patients found"
  - "Try adjusting your filters..."
- ✅ No spinner/loading state
- ✅ Table structure maintained

---

#### Test 13: Loading State

**Steps:**
1. Open DevTools Network tab
2. Throttle to "Slow 3G"
3. Change any filter
4. Observe loading behavior

**Expected Results:**
- ✅ Spinner appears in table
- ✅ "Loading patient data..." text shown
- ✅ Previous data cleared
- ✅ No flickering/jumps
- ✅ Spinner disappears when loaded

---

#### Test 14: Refresh Button

**Steps:**
1. Display some patients
2. Click refresh icon in table header
3. Observe behavior

**Expected Results:**
- ✅ Refresh icon spins
- ✅ Button disabled during reload
- ✅ Console shows: "Fetching recruitment detail with filters..."
- ✅ Data reloads with same filters
- ✅ Patient count remains same (if data unchanged)

---

#### Test 15: Filter Cascade

**Steps:**
1. Start with no selections
2. Try selecting ward before study
3. Try selecting condition before study

**Expected Results:**
- ✅ Ward dropdown disabled (no site selected)
- ✅ Condition filter enabled but has no effect (no study)
- ✅ Patient table hidden (no study selected)
- ✅ After selecting study → all filters become usable

---

#### Test 16: Filter Reset

**Steps:**
1. Set all filters: study "13NV", site "003", ward "4", condition "CAP"
2. Change study to different study
3. Observe state changes

**Expected Results:**
- ✅ Site selection clears (Redux clears dependent filters)
- ✅ Ward selection clears
- ✅ Condition selection persists (independent filter)
- ✅ Patient table updates with new study data
- ✅ Console logs reflect filter changes

---

#### Test 17: Multiple Groups Display

**Steps:**
1. Find a patient with multiple groups (check mock data)
2. Observe condition column

**Expected Results:**
- ✅ Primary condition chip shown (CAP or VAP)
- ✅ Below it: small outlined chips for each group
- ✅ Groups labeled clearly
- ✅ Chips sized appropriately (height: 18px, small font)

---

#### Test 18: Console Logging

**Steps:**
1. Open browser console
2. Perform various filter selections

**Expected Results:**
Console shows clear logs:
```
[MonthlyReport] DEVELOPMENT MODE: Using FHIR mock data for studies
[MonthlyReport] Loaded 10 studies from FHIR mock data
[MonthlyReport] Selected study: 13NV Pneumonia Study (13NV)
[MonthlyReport] Fetching recruitment detail with filters: { studyCode: "13NV", ... }
[MonthlyReport] Loaded 6 patients
[MonthlyReport] Calculated 1 months of statistics
[ConditionFilter] Setting condition: CAP
```

---

#### Test 19: Redux State Verification

**Steps:**
1. Open Redux DevTools
2. Select various filters
3. Check state updates

**Expected Results:**
Redux state shows:
```javascript
studySlice: {
  currentStudy: {
    id: "Study13NV",
    name: "...",
    studyCode: "13NV"
  },
  currentSite: { code: "003", ... },
  currentWard: { code: "4", ... },
  currentCondition: "CAP",
  alias: "13NV-003-4"
}
```

---

#### Test 20: Responsive Layout

**Steps:**
1. Resize browser window to mobile size (< 768px)
2. Check filter layout
3. Check table layout

**Expected Results:**
- ✅ Filters stack vertically (Grid item xs={12})
- ✅ Table scrollable horizontally if needed
- ✅ All functionality works on mobile
- ✅ Touch interactions work (expand/sort)

---

### Error Scenarios

#### Error 1: Missing Mock File

**Simulate:**
1. Delete `13NV-003-4 CAP.json`
2. Select filters to trigger this file

**Expected Results:**
- ✅ Console error: "Failed to load mock data..."
- ✅ Empty state shown (0 patients)
- ✅ No crash/blank page
- ✅ Other filters still work

---

#### Error 2: Malformed Mock Data

**Simulate:**
1. Edit mock file to have invalid JSON
2. Reload page

**Expected Results:**
- ✅ Console error caught
- ✅ Empty state shown
- ✅ Error logged clearly
- ✅ App remains functional

---

#### Error 3: Network Failure (Production)

**Simulate:**
1. Deploy to production
2. Simulate network error

**Expected Results:**
- ✅ Error caught in try/catch
- ✅ Console error logged
- ✅ Empty state shown with message
- ✅ Refresh button allows retry

---

## Future Enhancements

### Short Term (Next Sprint)

#### 1. Export Functionality
**Feature:** Export patient data to CSV/Excel

**Implementation:**
```javascript
import { exportToCSV } from '../../utils/exportUtils';

const handleExport = () => {
  exportToCSV(patientData.patients, 'recruitment-detail.csv');
};
```

**UI:**
- Export button in table header
- Format options: CSV, Excel, PDF
- Include filters in filename

---

#### 2. Advanced Filtering
**Feature:** Filter patients by date range, status, etc.

**Implementation:**
```jsx
<DateRangePicker
  startDate={filterStartDate}
  endDate={filterEndDate}
  onChange={(start, end) => setDateRange(start, end)}
/>

<StatusFilter
  statuses={['screening', 'eligible', 'enrolled']}
  selected={selectedStatuses}
  onChange={setSelectedStatuses}
/>
```

**Filter Logic:**
```javascript
const filteredPatients = patients.filter(p => {
  const dateInRange = p.startDate >= filterStartDate && p.startDate <= filterEndDate;
  const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(p.currentStatus);
  return dateInRange && statusMatch;
});
```

---

#### 3. Patient Search
**Feature:** Search by screening ID, name, or study ID

**Implementation:**
```jsx
<TextField
  label="Search patients"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Screening ID, Name, or Study ID"
/>
```

**Search Logic:**
```javascript
const searchedPatients = patients.filter(p => {
  const query = searchQuery.toLowerCase();
  return (
    p.screeningId?.toLowerCase().includes(query) ||
    p.name?.toLowerCase().includes(query) ||
    p.studyId?.toLowerCase().includes(query)
  );
});
```

---

#### 4. Pagination
**Feature:** Paginate patient list for large datasets

**Implementation:**
```jsx
<TablePagination
  rowsPerPageOptions={[10, 25, 50, 100]}
  component="div"
  count={patients.length}
  rowsPerPage={rowsPerPage}
  page={page}
  onPageChange={handleChangePage}
  onRowsPerPageChange={handleChangeRowsPerPage}
/>
```

---

### Medium Term (Next Quarter)

#### 5. Monthly Statistics Chart
**Feature:** Visualize monthly stats from calculateMonthlyStats()

**Chart Type:** Stacked bar chart or line chart

**Data:**
```javascript
const chartData = patientData.monthlyStats.map(month => ({
  month: month.month,
  screened: month.screened,
  eligible: month.eligible,
  enrolled: month.enrolled,
  notRegistered: month.notRegistered
}));
```

**Libraries:** Recharts or Chart.js

---

#### 6. Patient Detail Modal
**Feature:** Click patient row to open detailed modal

**Modal Contents:**
- Full patient information
- Complete timeline with notes
- Edit capability (if permissions allow)
- Document attachments
- Contact information

---

#### 7. Bulk Actions
**Feature:** Select multiple patients for bulk operations

**Actions:**
- Export selected
- Change status (batch)
- Assign to study (batch)
- Generate reports

**Implementation:**
```jsx
<Checkbox
  checked={selectedPatients.includes(patient.id)}
  onChange={() => togglePatientSelection(patient.id)}
/>
```

---

#### 8. Real-Time Updates
**Feature:** WebSocket connection for live updates

**Use Case:**
- New patient screened → Appears in table automatically
- Status changed by another user → Updates in real-time
- Study enrollment complete → Badge updates

**Implementation:**
```javascript
useEffect(() => {
  const socket = io(WEBSOCKET_URL);

  socket.on('patient-updated', (updatedPatient) => {
    setPatientData(prev => ({
      ...prev,
      patients: prev.patients.map(p =>
        p.id === updatedPatient.id ? updatedPatient : p
      )
    }));
  });

  return () => socket.disconnect();
}, []);
```

---

### Long Term (Next 6-12 Months)

#### 9. Analytics Dashboard
**Feature:** Comprehensive analytics on recruitment metrics

**Metrics:**
- Conversion rates (screening → enrollment)
- Time-to-enrollment trends
- Site/ward performance comparison
- Condition-specific success rates
- Predictive analytics (enrollment projections)

---

#### 10. Notification System
**Feature:** Alerts for recruitment milestones

**Notifications:**
- Study enrollment goal reached
- Patient needs follow-up
- Eligibility expiring soon
- Recruitment rate declining

---

#### 11. Custom Reports
**Feature:** User-defined report templates

**Capabilities:**
- Drag-and-drop report builder
- Save custom views
- Schedule automated reports
- Email distribution

---

#### 12. Integration with EHR Systems
**Feature:** Sync with hospital Electronic Health Records

**Benefits:**
- Auto-import patient data
- Reduce manual entry
- Real-time eligibility checks
- Streamlined workflow

---

## Troubleshooting

### Issue 1: Patient Table Not Appearing

**Symptoms:**
- Filters shown
- No patient table visible

**Diagnosis:**
```javascript
// Check these in console:
console.log('selectedStudy:', selectedStudy);        // Should not be empty
console.log('patientData:', patientData);            // Should have patients array
console.log('patients.length:', patientData.patients.length);
```

**Solutions:**
1. Ensure study is selected (table only shows when study selected)
2. Check mock file exists for filter combination
3. Verify no console errors
4. Check Redux state has filters set correctly

---

### Issue 2: Mock Data Not Loading

**Symptoms:**
- Console error: "Cannot find module..."
- Empty patient table

**Diagnosis:**
```bash
# Check mock files exist
ls vital-data-dashboard/src/mockData/tracking/

# Should show: 13NV.json, 13NV-003.json, etc.
```

**Solutions:**
1. Re-copy mock files from `data/Mock/tracking/`
2. Verify file naming matches pattern
3. Check JSON files are valid (no syntax errors)
4. Restart dev server after adding files

---

### Issue 3: Filters Not Triggering Reload

**Symptoms:**
- Change filter
- Patient table doesn't update

**Diagnosis:**
```javascript
// Check useEffect dependencies
useEffect(() => {
  fetchRecruitmentDetail();
}, [selectedStudy, currentSite, currentWard, currentCondition]);
// ^^^ All four dependencies must be included
```

**Solutions:**
1. Verify useEffect has correct dependencies
2. Check Redux state is updating (Redux DevTools)
3. Ensure fetchRecruitmentDetail is defined before useEffect
4. Check no ESLint warnings about missing dependencies

---

### Issue 4: Status Colors Not Showing

**Symptoms:**
- Status badges appear but no colors
- All badges look the same

**Diagnosis:**
```javascript
// Check getStatusColor function
const getStatusColor = (status) => {
  const colorMap = {
    'on-study': 'success',
    eligible: 'info',
    screening: 'warning',
    'not-registered': 'error',
    retired: 'default',
  };
  return colorMap[status] || 'default';
};
```

**Solutions:**
1. Verify status codes match colorMap keys exactly
2. Check MUI theme has color definitions
3. Ensure Chip component receives color prop
4. Inspect DOM to verify color classes applied

---

### Issue 5: Expandable Rows Not Working

**Symptoms:**
- Click expand arrow
- Timeline doesn't appear

**Diagnosis:**
```javascript
// Check Collapse component and state
const [open, setOpen] = useState(false);

<IconButton onClick={() => setOpen(!open)}>
  {/* Arrow icon should toggle */}
</IconButton>

<Collapse in={open}>
  {/* Timeline content */}
</Collapse>
```

**Solutions:**
1. Verify open state toggles (add console.log)
2. Check Collapse component imported from MUI
3. Ensure patient has progress array
4. Verify colSpan={9} matches number of columns

---

### Issue 6: Console Warnings

**Warning:** "React Hook useEffect has a missing dependency..."

**Solution:**
```javascript
// Add missing dependency to array
useEffect(() => {
  fetchRecruitmentDetail();
}, [selectedStudy, currentSite, currentWard, currentCondition]); // Include all

// OR wrap function in useCallback
const fetchRecruitmentDetail = useCallback(async () => {
  // ... function body
}, [selectedStudy, currentSite, currentWard, currentCondition]);
```

---

## Conclusion

The recruitment detail implementation is now complete and fully functional. The system provides:

✅ **Complete Filtering** - Study → Site → Ward → Condition hierarchy
✅ **Interactive UI** - Sortable, expandable patient table
✅ **Visual Clarity** - Color-coded statuses, condition badges
✅ **Development Support** - Mock data for testing without backend
✅ **Production Ready** - FHIR API integration prepared
✅ **Maintainable Code** - Extensive comments and documentation
✅ **Extensible Architecture** - Easy to add new features

### Next Steps

1. **Test Thoroughly** - Use testing guide above
2. **Gather Feedback** - Show to users/stakeholders
3. **Plan Enhancements** - Prioritize from future enhancements list
4. **Monitor Performance** - Check load times with real data
5. **Update Documentation** - Keep this report current with changes

---

## References

### Related Files
- [RECRUITMENT_DETAIL_MOCK_DATA_ANALYSIS.md](./RECRUITMENT_DETAIL_MOCK_DATA_ANALYSIS.md) - Mock data structure analysis
- [src/services/fhirService.js](./vital-data-dashboard/src/services/fhirService.js) - FHIR service functions
- [src/store/studySlice.js](./vital-data-dashboard/src/store/studySlice.js) - Redux state management

### External Resources
- [FHIR ResearchSubject Resource](https://www.hl7.org/fhir/researchsubject.html)
- [Material-UI Table Documentation](https://mui.com/material-ui/react-table/)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)

---

**Report Generated:** 2026-01-13
**Author:** Claude (AI Assistant)
**Version:** 1.0.0
**Status:** Complete ✅
