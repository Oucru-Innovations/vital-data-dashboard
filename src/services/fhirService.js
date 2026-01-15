/**
 * FHIR API Service for Vital Data Dashboard
 *
 * This service handles fetching FHIR (Fast Healthcare Interoperability Resources) data
 * for organizations (sites and wards). It automatically switches between:
 * - DEVELOPMENT MODE: Uses local mock JSON files
 * - PRODUCTION MODE: Calls real FHIR API endpoints
 *
 * The decision is based on the REACT_APP_FHIR_URL environment variable.
 * If it contains 'localhost', mock data is used. Otherwise, real API calls are made.
 *
 * Environment Configuration:
 * - Development (.env.development): REACT_APP_FHIR_URL=http://localhost:8080/fhir
 * - Production (.env): REACT_APP_FHIR_URL=https://your-fhir-server.com/fhir
 */

import axios from 'axios';

/**
 * FHIR API Base URL Configuration
 *
 * Priority:
 * 1. Environment variable REACT_APP_FHIR_URL
 * 2. Fallback to localhost for development
 *
 * The URL determines whether to use mock data or real API:
 * - Contains 'localhost' → Load mock JSON files (development)
 * - Other URLs → Make real FHIR API calls (production)
 */
const FHIR_API_URL = process.env.REACT_APP_FHIR_URL || 'http://localhost:8080/fhir';

/**
 * Determine if we should use mock data
 *
 * Mock data is used when:
 * - FHIR_API_URL contains 'localhost' (development environment)
 * - No internet connection to FHIR server
 * - Testing with local data
 *
 * @returns {boolean} True if should use mock data, false for real API
 */
const shouldUseMockData = () => {
  return FHIR_API_URL.includes('localhost');
};

/**
 * Create axios client for FHIR API calls
 *
 * Configuration:
 * - baseURL: FHIR server endpoint
 * - timeout: 10 seconds (FHIR queries can be slow)
 * - headers: Accept JSON format (FHIR default is XML)
 */
const fhirClient = axios.create({
  baseURL: FHIR_API_URL,
  timeout: 10000,
  headers: {
    'Accept': 'application/fhir+json',
    'Content-Type': 'application/fhir+json',
  },
});

/**
 * Fetch Sites (Hospitals) - Organizations with type=prov
 *
 * DEVELOPMENT MODE:
 * - Loads data from: src/mockData/fhir/getOrganizationHospital.json
 * - Returns immediately without network call
 *
 * PRODUCTION MODE:
 * - API Endpoint: GET /Organization?type=prov
 * - Returns FHIR Bundle with Organization resources
 *
 * FHIR Resource Structure:
 * {
 *   resourceType: "Bundle",
 *   type: "searchset",
 *   entry: [{
 *     resource: {
 *       resourceType: "Organization",
 *       id: "09Hospital",
 *       identifier: [{ value: "1D" }],  // This becomes code
 *       type: [{ coding: [{ code: "prov" }] }],
 *       name: "09 Hospital",
 *       alias: ["09H", "HANOI_SITE"]
 *     }
 *   }]
 * }
 *
 * @returns {Promise<Object>} FHIR Bundle containing Organization resources (sites)
 * @throws {Error} If API call fails or mock data cannot be loaded
 */
export const getSites = async () => {
  try {
    // DEVELOPMENT MODE: Load mock data from local JSON file
    if (shouldUseMockData()) {
      console.log('[FHIR Service] Using MOCK data for sites (development mode)');

      // Dynamic import of JSON file
      // This loads the file at runtime and returns the JSON content
      const mockData = await import('../mockData/fhir/getOrganizationHospital.json');

      // Return the default export from the JSON module
      // Wrap in Promise.resolve for consistent async behavior
      return Promise.resolve(mockData.default);
    }

    // PRODUCTION MODE: Call real FHIR API
    console.log('[FHIR Service] Fetching sites from FHIR API:', FHIR_API_URL);

    /**
     * FHIR Query Parameters:
     * - type=prov: Filter for healthcare provider organizations (hospitals)
     * - _count=1000: Return up to 1000 results (default is usually 20)
     * - _sort=name: Sort results by organization name
     *
     * Full URL: http://fhir-server/Organization?type=prov&_count=1000&_sort=name
     */
    const response = await fhirClient.get('/Organization', {
      params: {
        type: 'prov',      // Healthcare Provider type
        _count: 1000,      // Max results
        _sort: 'name',     // Sort by name
      },
    });

    return response.data;
  } catch (error) {
    console.error('[FHIR Service] Error fetching sites:', error);

    // Re-throw with more context
    throw new Error(`Failed to fetch sites: ${error.message}`);
  }
};

/**
 * Fetch Wards (Departments) - Organizations with type=dept
 *
 * DEVELOPMENT MODE:
 * - Loads data from: src/mockData/fhir/getOrganizationWard.json
 * - Returns immediately without network call
 *
 * PRODUCTION MODE:
 * - API Endpoint: GET /Organization?type=dept
 * - Optional: Can filter by partof parameter for specific site
 * - Returns FHIR Bundle with Organization resources
 *
 * FHIR Resource Structure:
 * {
 *   resourceType: "Bundle",
 *   type: "searchset",
 *   entry: [{
 *     resource: {
 *       resourceType: "Organization",
 *       id: "AICUWardExample",
 *       identifier: [{ value: "003-001" }],  // This becomes code
 *       type: [{ coding: [{ code: "dept" }] }],
 *       name: "HTD Adult ICU",
 *       alias: ["HTD AICU", "56EI-003-1", "56EI-003-2"],  // Study-site-ward patterns
 *       partOf: { reference: "Organization/HospitalID" }
 *     }
 *   }]
 * }
 *
 * Ward Alias Pattern:
 * - Format: ${studyCode}-${siteCode}-${wardNumber}
 * - Example: "56EI-003-1" means Study 56EI, Site 003, Ward 1
 * - Used for filtering wards by study-site combination
 *
 * @param {string} [siteId] - Optional site ID to filter wards by hospital
 * @returns {Promise<Object>} FHIR Bundle containing Organization resources (wards)
 * @throws {Error} If API call fails or mock data cannot be loaded
 */
export const getWards = async (siteId = null) => {
  try {
    // DEVELOPMENT MODE: Load mock data from local JSON file
    if (shouldUseMockData()) {
      console.log('[FHIR Service] Using MOCK data for wards (development mode)');

      // Dynamic import of JSON file
      const mockData = await import('../mockData/fhir/getOrganizationWard.json');

      // Return the default export from the JSON module
      return Promise.resolve(mockData.default);
    }

    // PRODUCTION MODE: Call real FHIR API
    console.log('[FHIR Service] Fetching wards from FHIR API:', FHIR_API_URL);

    /**
     * FHIR Query Parameters:
     * - type=dept: Filter for department organizations (wards)
     * - partof: Optional filter by parent organization (site/hospital)
     * - _count=1000: Return up to 1000 results
     * - _sort=name: Sort results by organization name
     *
     * Example URLs:
     * - All wards: /Organization?type=dept&_count=1000
     * - Site wards: /Organization?type=dept&partof=Organization/HospitalID
     */
    const params = {
      type: 'dept',        // Department type
      _count: 1000,        // Max results
      _sort: 'name',       // Sort by name
    };

    // Add partof filter if siteId provided
    // This filters wards belonging to a specific hospital
    if (siteId) {
      params.partof = `Organization/${siteId}`;
    }

    const response = await fhirClient.get('/Organization', { params });

    return response.data;
  } catch (error) {
    console.error('[FHIR Service] Error fetching wards:', error);

    // Re-throw with more context
    throw new Error(`Failed to fetch wards: ${error.message}`);
  }
};

/**
 * Preprocess FHIR Organization Resources into Simplified Objects
 *
 * Transforms complex FHIR Bundle into simplified site/ward objects.
 * Extracts only the fields needed for dropdowns and filtering.
 *
 * FHIR Bundle → Simplified Array
 *
 * @param {Object} bundle - FHIR Bundle resource
 * @param {string} bundle.resourceType - Should be "Bundle"
 * @param {Array} bundle.entry - Array of {resource: Organization}
 * @returns {Array<Object>} Simplified organization objects
 */
export const preprocessOrganizations = (bundle) => {
  // Validate input
  if (!bundle || bundle.resourceType !== 'Bundle' || !bundle.entry) {
    console.warn('[FHIR Service] Invalid FHIR Bundle structure:', bundle);
    return [];
  }

  /**
   * Transform each Organization resource:
   *
   * FHIR Organization {
   *   id: "09Hospital",
   *   identifier: [{ value: "1D" }],
   *   name: "09 Hospital",
   *   alias: ["09H", "HANOI_SITE"]
   * }
   *
   * →
   *
   * Simplified {
   *   id: "09Hospital",
   *   name: "09 Hospital",
   *   code: "1D",           // From identifier.value
   *   alias: ["09H", "HANOI_SITE"]
   * }
   */
  return bundle.entry
    .map((entry) => {
      const org = entry.resource;

      return {
        id: org.id,
        name: org.name,

        // Extract code from first identifier
        // identifier is an array: [{ system: "...", value: "1D" }]
        code: org.identifier?.[0]?.value || '',

        // Copy alias array, default to empty array if not present
        alias: org.alias || [],
      };
    })
    // Filter out any organizations with missing essential data
    .filter((org) => org.id && org.name);
};

/**
 * Fetch and Preprocess Sites
 *
 * Convenience function that combines getSites() + preprocessing.
 * Returns simplified site objects ready for dropdowns.
 *
 * @returns {Promise<Array<Object>>} Array of simplified site objects
 */
export const getProcessedSites = async () => {
  const bundle = await getSites();
  return preprocessOrganizations(bundle);
};

/**
 * Fetch and Preprocess Wards
 *
 * Convenience function that combines getWards() + preprocessing.
 * Returns simplified ward objects ready for dropdowns.
 *
 * @param {string} [siteId] - Optional site ID filter
 * @returns {Promise<Array<Object>>} Array of simplified ward objects
 */
export const getProcessedWards = async (siteId = null) => {
  const bundle = await getWards(siteId);
  return preprocessOrganizations(bundle);
};

/**
 * Check if currently in development mode
 *
 * Useful for conditional logic in components.
 * Example: Show debug info only in development
 *
 * @returns {boolean} True if in development mode
 */
export const isDevelopmentMode = () => {
  return shouldUseMockData();
};

/**
 * Fetch ResearchStudy resources (Studies)
 *
 * In DEVELOPMENT mode (localhost):
 * - Loads from: src/mockData/fhir/getResearchStudy.json
 *
 * In PRODUCTION mode:
 * - Calls FHIR API: GET /ResearchStudy
 *
 * ResearchStudy Resource Structure:
 * {
 *   resourceType: "ResearchStudy",
 *   id: "Study00EI",
 *   identifier: [{ value: "00EI" }],  // Study code
 *   name: "Study Name",
 *   status: "active" | "completed",
 *   period: { start: "2025-01-01", end: "2025-12-31" },
 *   site: [{ reference: "Organization/HospitalID" }]
 * }
 *
 * @returns {Promise<Object>} FHIR Bundle with ResearchStudy entries
 * @throws {Error} If fetch fails
 */
export const getStudies = async () => {
  try {
    if (shouldUseMockData()) {
      console.log('[FHIR Service] Using MOCK data for studies (development mode)');
      const mockData = await import('../mockData/fhir/getResearchStudy.json');
      return Promise.resolve(mockData.default);
    }

    console.log('[FHIR Service] Fetching studies from FHIR API:', FHIR_API_URL);
    const response = await fhirClient.get('/ResearchStudy', {
      params: {
        _count: 1000,
        _sort: 'name',
      },
    });
    return response.data;
  } catch (error) {
    console.error('[FHIR Service] Error fetching studies:', error);
    throw new Error(`Failed to fetch studies: ${error.message}`);
  }
};

/**
 * Preprocess ResearchStudy Bundle into simplified study objects
 *
 * Transforms FHIR Bundle structure into an array of study objects
 * suitable for dropdown display and Redux state.
 *
 * Input: FHIR Bundle with ResearchStudy entries
 * Output: Array of study objects with extracted fields
 *
 * Extracted fields:
 * - id: Study resource ID
 * - name: Study name (title field)
 * - studyCode: Study identifier value (e.g., "54EI")
 * - status: Study status (active, completed, etc.)
 * - site: Array of site references
 * - period: Study period (start/end dates)
 *
 * @param {Object} bundle - FHIR Bundle with ResearchStudy resources
 * @returns {Array} Array of simplified study objects
 */
export const preprocessStudies = (bundle) => {
  if (!bundle || bundle.resourceType !== 'Bundle' || !bundle.entry) {
    console.warn('[FHIR Service] Invalid ResearchStudy bundle:', bundle);
    return [];
  }

  return bundle.entry
    .map((entry) => {
      const study = entry.resource;

      // Extract study code from identifier
      // identifier is array, typically first element has the study code
      const studyCode = study.identifier?.[0]?.value || study.id;

      return {
        id: study.id,
        name: study.name || study.title || 'Unnamed Study',
        studyCode: studyCode,
        status: study.status || 'unknown',
        site: study.site || [],
        period: study.period || {},
      };
    })
    .filter((study) => study.id && study.name); // Only include valid studies
};

/**
 * Convenience function: Fetch and preprocess studies
 *
 * Combines getStudies() and preprocessStudies() into one call.
 * This is the recommended function to use in components.
 *
 * @returns {Promise<Array>} Array of simplified study objects
 *
 * Example usage:
 * const studies = await getProcessedStudies();
 * studies = [
 *   { id: "Study54EI", name: "54EI Study", studyCode: "54EI", status: "active", site: [...] },
 *   { id: "Study56EI", name: "56EI Study", studyCode: "56EI", status: "active", site: [...] },
 * ]
 */
export const getProcessedStudies = async () => {
  const bundle = await getStudies();
  return preprocessStudies(bundle);
};

/**
 * ============================================================================
 * RECRUITMENT DETAIL FUNCTIONS
 * ============================================================================
 * Functions for fetching detailed patient recruitment/screening data
 */

/**
 * Get Recruitment Detail Data
 *
 * Fetches detailed patient-level recruitment and screening data for tracking.
 * This includes individual patient journeys through the screening/enrollment process.
 *
 * DEVELOPMENT MODE (localhost):
 * ============================
 * Loads from mock JSON files based on filter combination:
 * - Study only: "{studyCode}.json"
 * - Study + Site: "{studyCode}-{siteCode}.json"
 * - Study + Site + Ward: "{studyCode}-{siteCode}-{wardCode}.json"
 * - With Condition: "{studyCode}-{siteCode}-{wardCode} {condition}.json"
 *
 * Example file names:
 * - "13NV.json" - All patients for study 13NV
 * - "13NV-003.json" - Study 13NV at site 003
 * - "13NV-003-4.json" - Study 13NV, site 003, ward 4
 * - "13NV-003-4 CAP.json" - Study 13NV, site 003, ward 4, CAP condition only
 *
 * PRODUCTION MODE:
 * ===============
 * Calls FHIR API: GET /ResearchSubject with parameters:
 * - study: ResearchStudy/{studyId}
 * - subject:Patient.organization: Organization/{wardId}
 * - condition-extension: {conditionCode}
 * - status:not: retired
 *
 * @param {Object} filters - Filter parameters
 * @param {string} filters.studyCode - Study code (e.g., "13NV")
 * @param {string} [filters.siteCode] - Site code (e.g., "003")
 * @param {string} [filters.wardCode] - Ward code (e.g., "4")
 * @param {string} [filters.condition] - Condition filter (e.g., "CAP", "VAP")
 * @returns {Promise<Object>} FHIR Bundle with ResearchSubject entries
 * @throws {Error} If fetch fails
 *
 * @example
 * // Get all patients for study 13NV
 * const data = await getRecruitmentDetail({ studyCode: "13NV" });
 *
 * @example
 * // Get CAP patients at ward 4
 * const data = await getRecruitmentDetail({
 *   studyCode: "13NV",
 *   siteCode: "003",
 *   wardCode: "4",
 *   condition: "CAP"
 * });
 */
export const getRecruitmentDetail = async (filters) => {
  const { studyCode, siteCode, wardCode, condition } = filters;

  try {
    if (shouldUseMockData()) {
      // BUILD MOCK FILE NAME
      // Pattern: {study}-{site}-{ward} {condition}.json
      let filename = studyCode; // Start with "13NV"

      if (siteCode) {
        filename += `-${siteCode}`; // "13NV-003"
      }

      if (wardCode) {
        filename += `-${wardCode}`; // "13NV-003-4"
      }

      if (condition) {
        filename += ` ${condition}`; // "13NV-003-4 CAP"
      }

      filename += '.json';

      console.log(`[FHIR Service] Loading recruitment detail from MOCK file: ${filename}`);
      console.log(`[FHIR Service] Filters:`, { studyCode, siteCode, wardCode, condition });

      // Try to load the mock file
      try {
        const mockData = await import(`../mockData/tracking/${filename}`);
        console.log(`[FHIR Service] Successfully loaded ${mockData.default.total} patients from mock data`);
        return Promise.resolve(mockData.default);
      } catch (importError) {
        console.warn(`[FHIR Service] Mock file not found: ${filename}`);
        console.warn(`[FHIR Service] Returning empty bundle`);

        // Return empty bundle if file doesn't exist
        return Promise.resolve({
          resourceType: 'Bundle',
          type: 'searchset',
          total: 0,
          entry: []
        });
      }
    }

    // PRODUCTION MODE: Call FHIR API
    // TODO REPLACE with BACKEND API: Update this section when backend API is ready
    // Expected API endpoint: GET /api/recruitment-detail
    // Expected parameters:
    //   - studyCode: string (required) - e.g., "13NV"
    //   - siteCode: string (optional) - e.g., "003"
    //   - wardCode: string (optional) - e.g., "4"
    //   - condition: string (optional) - e.g., "CAP" or "VAP"
    // Expected response: FHIR Bundle with ResearchSubject resources
    console.log('[FHIR Service] Fetching recruitment detail from FHIR API');

    const params = {
      _count: 2000,
      'status:not': 'retired',
      study: `ResearchStudy/Study${studyCode}`,
    };

    // TODO REPLACE with BACKEND API: Add site filter parameter
    // Currently site filtering is not implemented in FHIR query
    // Backend should support: site={siteCode} parameter
    if (siteCode) {
      console.log(`[FHIR Service] Site filter requested: ${siteCode} (not yet implemented in FHIR query)`);
      // params['site'] = siteCode; // Uncomment when backend supports this
    }

    // Add ward filter if provided
    // TODO REPLACE with BACKEND API: Verify ward filter parameter name with backend team
    if (wardCode) {
      // Note: This assumes wardCode maps to organization ID
      // May need adjustment based on actual FHIR structure
      params['subject:Patient.organization'] = `Organization/Ward${wardCode}`;
    }

    // Add condition filter if provided
    // TODO REPLACE with BACKEND API: Verify condition filter parameter and codes with backend team
    if (condition) {
      // Map condition names to SNOMED codes
      const conditionCodes = {
        CAP: '385093006', // Community Acquired Pneumonia
        VAP: '87828008',  // Ventilator-Associated Pneumonia (example)
      };

      if (conditionCodes[condition]) {
        params['condition-extension'] = conditionCodes[condition];
      }
    }

    const response = await fhirClient.get('/ResearchSubject', { params });
    return response.data;
  } catch (error) {
    console.error('[FHIR Service] Error fetching recruitment detail:', error);
    throw new Error(`Failed to fetch recruitment detail: ${error.message}`);
  }
};

/**
 * Preprocess ResearchSubject Bundle into patient summary objects
 *
 * Transforms complex FHIR ResearchSubject Bundle into simplified patient objects
 * suitable for display in tables and charts.
 *
 * Extracts key information:
 * - Patient identification (screening ID, name, study ID)
 * - Condition and comparison groups
 * - Current status and progress history
 * - Timeline of state changes with reasons
 *
 * @param {Object} bundle - FHIR Bundle with ResearchSubject resources
 * @returns {Array} Array of patient summary objects
 *
 * Output structure:
 * [{
 *   id: "3666",
 *   screeningId: "1",
 *   name: "N1",
 *   birthYear: "2001",
 *   condition: "CAP",
 *   groups: ["CAP"],
 *   currentStatus: "not-registered",
 *   statusText: "Not Registered",
 *   reason: "No INC #3",
 *   startDate: "2026-01-09",
 *   lastUpdate: "2026-01-11",
 *   studyId: null,
 *   ward: "WardNTTHED",
 *   progress: [...],
 *   raw: {...}
 * }]
 */
export const preprocessRecruitmentDetail = (bundle) => {
  if (!bundle || bundle.resourceType !== 'Bundle' || !bundle.entry) {
    console.warn('[FHIR Service] Invalid ResearchSubject bundle:', bundle);
    return [];
  }

  return bundle.entry
    .map((entry) => {
      const researchSubject = entry.resource;
      const extensions = researchSubject.extension || [];
      const progress = researchSubject.progress || [];
      const subject = researchSubject.subject;

      // EXTRACT CONDITION
      // Look for condition extension
      const conditionExt = extensions.find((e) =>
        e.url && e.url.includes('/condition')
      );
      const condition = conditionExt?.valueCodeableConcept?.text || 'Unknown';

      // EXTRACT COMPARISON GROUPS
      // A patient can belong to multiple groups (e.g., both VAP and CAP)
      const groupExts = extensions.filter((e) =>
        e.url && e.url.includes('/comparisonGroup')
      );
      const groups = groupExts.map((e) => e.valueId).filter(Boolean);

      // EXTRACT LATEST STATUS
      // Progress array shows journey: screening → eligible → enrolled
      const latestProgress = progress[progress.length - 1];
      const currentStatusCode = latestProgress?.subjectState?.coding?.[0]?.code || 'unknown';
      const reason = latestProgress?.reason?.text || '';
      const lastUpdate = latestProgress?.startDate;

      // Get first screening date
      const firstProgress = progress[0];
      const startDate = firstProgress?.startDate;

      // MAP STATUS CODES TO DISPLAY TEXT
      const statusDisplayMap = {
        screening: 'Screening',
        eligible: 'Eligible',
        'on-study': 'Enrolled',
        'not-registered': 'Not Registered',
        retired: 'Retired',
        unknown: 'Unknown',
      };
      const statusText = statusDisplayMap[currentStatusCode] || currentStatusCode;

      // EXTRACT PATIENT INFO
      const screeningId = subject?.identifier?.[0]?.value || '';
      const name = subject?.name?.[0]?.given?.[0] || 'Unknown';
      const birthYear = subject?.birthDate || '';
      const wardRef = subject?.managingOrganization?.reference || '';
      const wardId = wardRef.split('/')[1] || '';

      // EXTRACT STUDY ID (only for enrolled patients)
      // Study ID is in the linked patient record
      let studyId = null;
      if (subject?.link && subject.link.length > 0) {
        const linkedPatient = subject.link[0]?.other;
        studyId = linkedPatient?.name?.[0]?.given?.[0] || null;
      }

      return {
        id: researchSubject.id,
        screeningId,
        name,
        birthYear,
        condition,
        groups,
        currentStatus: currentStatusCode,
        statusText,
        reason,
        startDate,
        lastUpdate,
        studyId,
        ward: wardId,
        progress,
        raw: researchSubject, // Keep raw data for detailed views
      };
    })
    .filter((patient) => patient.id); // Only include valid entries
};

/**
 * Convenience function: Fetch and preprocess recruitment detail
 *
 * Combines getRecruitmentDetail() and preprocessRecruitmentDetail() into one call.
 * This is the recommended function to use in components.
 *
 * @param {Object} filters - Filter parameters (see getRecruitmentDetail)
 * @returns {Promise<Array>} Array of patient summary objects
 *
 * @example
 * const patients = await getProcessedRecruitmentDetail({
 *   studyCode: "13NV",
 *   siteCode: "003",
 *   wardCode: "4",
 *   condition: "CAP"
 * });
 */
export const getProcessedRecruitmentDetail = async (filters) => {
  const bundle = await getRecruitmentDetail(filters);
  return preprocessRecruitmentDetail(bundle);
};

/**
 * Calculate monthly statistics from patient data
 *
 * Groups patients by month and calculates screening/enrollment statistics.
 *
 * @param {Array} patients - Array of patient summary objects
 * @returns {Array} Monthly statistics
 *
 * Output: [{
 *   month: "2026-01",
 *   screened: 6,
 *   eligible: 3,
 *   enrolled: 2,
 *   notRegistered: 3,
 *   successRate: 33.3
 * }]
 */
export const calculateMonthlyStats = (patients) => {
  // Group patients by month
  const monthlyGroups = {};

  patients.forEach((patient) => {
    if (!patient.startDate) return;

    const date = new Date(patient.startDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyGroups[monthKey]) {
      monthlyGroups[monthKey] = [];
    }
    monthlyGroups[monthKey].push(patient);
  });

  // Calculate statistics for each month
  return Object.entries(monthlyGroups)
    .map(([month, monthPatients]) => {
      const screened = monthPatients.length;

      // Count by status
      const eligible = monthPatients.filter((p) =>
        p.progress.some((pr) => pr.subjectState?.coding?.[0]?.code === 'eligible')
      ).length;

      const enrolled = monthPatients.filter((p) =>
        p.progress.some((pr) => pr.subjectState?.coding?.[0]?.code === 'on-study')
      ).length;

      const notRegistered = monthPatients.filter(
        (p) => p.currentStatus === 'not-registered'
      ).length;

      const successRate = screened > 0 ? ((enrolled / screened) * 100).toFixed(1) : 0;

      return {
        month,
        screened,
        eligible,
        enrolled,
        notRegistered,
        successRate: parseFloat(successRate),
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month)); // Sort chronologically
};

/**
 * Group patients by current status
 *
 * @param {Array} patients - Array of patient summary objects
 * @returns {Object} Patients grouped by status
 *
 * Output: {
 *   screening: [...],
 *   eligible: [...],
 *   enrolled: [...],
 *   notRegistered: [...],
 *   retired: [...]
 * }
 */
export const groupPatientsByStatus = (patients) => {
  return {
    screening: patients.filter((p) => p.currentStatus === 'screening'),
    eligible: patients.filter((p) => p.currentStatus === 'eligible'),
    enrolled: patients.filter((p) => p.currentStatus === 'on-study'),
    notRegistered: patients.filter((p) => p.currentStatus === 'not-registered'),
    retired: patients.filter((p) => p.currentStatus === 'retired'),
  };
};

/**
 * Generate Screening Summary Data from Patient Array
 *
 * Creates a screening summary in the format expected by ScreeningTable component.
 * Groups patients by condition and calculates screening metrics.
 *
 * DEVELOPMENT MODE HELPER:
 * This function is used to generate mock screening data from patient detail data.
 * In production, this data comes from the backend API.
 *
 * @param {Array} patients - Array of processed patient objects
 * @param {string} studyCode - Study code (e.g., "13NV")
 * @param {Date} endDate - Report end date
 * @returns {Object} Screening summary in ScreeningTable format
 *
 * Expected Output Format:
 * {
 *   date: "2026-01-13",
 *   study: "13NV",
 *   screening_summary: {
 *     comparision_groups: ["CAP", "VAP", "Total"],
 *     screened: [6, 5, 11],
 *     enrolled: [3, 2, 5],
 *     ineligible: [1, 1, 2],
 *     declined: [2, 2, 4],
 *     other_reasons: [0, 0, 0],
 *     withdrawn: [null, null, null],
 *     lost_followup: [null, null, null],
 *     discharged: [null, null, null],
 *     exclusion_reasons: {},
 *     cummulative_screened: [6, 5, 11]
 *   }
 * }
 */
export const generateScreeningSummary = (patients, studyCode, endDate) => {
  // Get unique conditions from patients
  const conditions = [...new Set(patients.map(p => p.condition))].filter(Boolean);

  // Add "Total" group
  const groups = [...conditions, 'Total'];

  // Initialize counters for each group
  const counters = {};
  groups.forEach(group => {
    counters[group] = {
      screened: 0,
      enrolled: 0,
      ineligible: 0,
      declined: 0,
      other_reasons: 0,
    };
  });

  // Count patients by condition and status
  patients.forEach(patient => {
    const condition = patient.condition || 'Unknown';

    // Count for specific condition
    if (counters[condition]) {
      counters[condition].screened++;

      if (patient.currentStatus === 'on-study') {
        counters[condition].enrolled++;
      } else if (patient.currentStatus === 'not-registered') {
        // Check reason to categorize
        const reason = patient.reason?.toLowerCase() || '';
        if (reason.includes('ineligible') || reason.includes('inc') || reason.includes('exc')) {
          counters[condition].ineligible++;
        } else if (reason.includes('decline') || reason.includes('refused')) {
          counters[condition].declined++;
        } else {
          counters[condition].other_reasons++;
        }
      }
    }

    // Count for Total
    counters.Total.screened++;
    if (patient.currentStatus === 'on-study') {
      counters.Total.enrolled++;
    } else if (patient.currentStatus === 'not-registered') {
      const reason = patient.reason?.toLowerCase() || '';
      if (reason.includes('ineligible') || reason.includes('inc') || reason.includes('exc')) {
        counters.Total.ineligible++;
      } else if (reason.includes('decline') || reason.includes('refused')) {
        counters.Total.declined++;
      } else {
        counters.Total.other_reasons++;
      }
    }
  });

  // Build arrays in group order
  const screened = groups.map(g => counters[g].screened);
  const enrolled = groups.map(g => counters[g].enrolled);
  const ineligible = groups.map(g => counters[g].ineligible);
  const declined = groups.map(g => counters[g].declined);
  const other_reasons = groups.map(g => counters[g].other_reasons);

  return {
    date: endDate.toISOString().split('T')[0],
    study: studyCode,
    screening_summary: {
      comparision_groups: groups,
      screened,
      enrolled,
      ineligible,
      declined,
      other_reasons,
      withdrawn: groups.map(() => null),
      lost_followup: groups.map(() => null),
      discharged: groups.map(() => null),
      exclusion_reasons: {},
      cummulative_screened: screened, // Same as screened for current period
    }
  };
};

/**
 * Format date based on timepoint selection
 *
 * @param {string} dateStr - ISO date string (e.g., "2026-01-15")
 * @param {string} timepoint - Aggregation period: daily, weekly, monthly, quarterly, yearly
 * @returns {string} Formatted date key for grouping
 */
const formatDateByTimepoint = (dateStr, timepoint) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (timepoint) {
    case 'daily':
      return `${year}-${month}-${day}`; // "2026-01-15"

    case 'weekly':
      // Get week number (ISO week)
      const startOfYear = new Date(year, 0, 1);
      const dayOfYear = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
      return `${year}-W${String(weekNumber).padStart(2, '0')}`; // "2026-W03"

    case 'monthly':
      return `${year}-${month}`; // "2026-01"

    case 'quarterly':
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      return `${year}-Q${quarter}`; // "2026-Q1"

    case 'yearly':
      return `${year}`; // "2026"

    default:
      return `${year}-${month}`; // Default to monthly
  }
};

/**
 * Generate Recruitment Details Data from Patient Array
 *
 * Creates recruitment tracking data in the format expected by RecruitmentTable component.
 * Calculates recruitment numbers and cumulative totals based on selected timepoint.
 *
 * DEVELOPMENT MODE HELPER:
 * This function is used to generate mock recruitment data from patient detail data.
 * In production, this data comes from the backend API.
 *
 * @param {Array} patients - Array of processed patient objects
 * @param {string} studyCode - Study code (e.g., "13NV")
 * @param {Object} options - Optional configuration
 * @param {number} options.targetRecruitment - Target number of patients (default: estimate from data)
 * @param {Date} options.endDate - Filter enrollments up to this date (default: no filter)
 * @param {number} options.limit - Number of most recent periods to return (default: 12)
 * @param {string} options.timepoint - Aggregation period: daily, weekly, monthly, quarterly, yearly (default: monthly)
 * @returns {Array} Recruitment details in RecruitmentTable format
 *
 * Expected Output Format:
 * [
 *   {
 *     study: "13NV",
 *     date: "2026-01",
 *     recruited_number: 5,
 *     cumulative_recruited: 5,
 *     cumulativerecruited: 5,
 *     target: 50,
 *     remaining_days: 300
 *   }
 * ]
 */
export const generateRecruitmentDetails = (patients, studyCode, options = {}) => {
  const { targetRecruitment = null, endDate = null, limit = 12, timepoint = 'monthly' } = options;

  console.log(`[generateRecruitmentDetails] Processing ${patients.length} patients for study ${studyCode}`);
  console.log('[generateRecruitmentDetails] Options:', { endDate: endDate?.toISOString(), limit, timepoint });

  // Group enrolled patients by period (based on timepoint)
  const enrolledByPeriod = {};
  const endDateStr = endDate ? endDate.toISOString().split('T')[0] : null;

  patients.forEach(patient => {
    // Check if patient was EVER enrolled (not just currently enrolled)
    // Look for 'on-study' entry in progress array
    const enrollmentProgress = patient.progress?.find(
      p => p.subjectState?.coding?.[0]?.code === 'on-study'
    );

    if (enrollmentProgress) {
      const enrollmentDate = enrollmentProgress.startDate;

      if (enrollmentDate) {
        // Filter by end date if provided
        if (endDateStr && enrollmentDate > endDateStr) {
          return; // Skip patients enrolled after end date
        }

        // Format date based on selected timepoint
        const periodKey = formatDateByTimepoint(enrollmentDate, timepoint);
        enrolledByPeriod[periodKey] = (enrolledByPeriod[periodKey] || 0) + 1;
      } else {
        console.warn(`[generateRecruitmentDetails] Patient ${patient.id} has on-study progress but no startDate`);
      }
    }
  });

  // Sort periods chronologically
  const periods = Object.keys(enrolledByPeriod).sort();

  console.log('[generateRecruitmentDetails] Enrolled by period:', enrolledByPeriod);
  console.log('[generateRecruitmentDetails] Periods found:', periods);

  // If no periods found, return empty array
  if (periods.length === 0) {
    console.warn('[generateRecruitmentDetails] No enrolled patients with dates found');
    return [];
  }

  // If no target provided, estimate as enrolled * 2 (assuming 50% enrollment rate)
  // Count patients who were EVER enrolled (have 'on-study' in their progress)
  const totalEnrolled = patients.filter(p =>
    p.progress?.some(prog => prog.subjectState?.coding?.[0]?.code === 'on-study')
  ).length;
  const target = targetRecruitment || Math.max(totalEnrolled * 2, 50);

  // Limit to most recent N periods if specified
  const recentPeriods = limit > 0 ? periods.slice(-limit) : periods;

  // Calculate cumulative and build result
  let cumulative = 0;
  return recentPeriods.map(period => {
    const recruited = enrolledByPeriod[period];
    cumulative += recruited;

    return {
      study: studyCode,
      date: period,
      recruited_number: recruited,
      cumulative_recruited: cumulative,
      cumulativerecruited: cumulative, // Alternative field name used in component
      target: target,
      remaining_days: 180, // Placeholder - could calculate from study end date
    };
  });
};

// Export configuration for testing/debugging
export const getFhirConfig = () => ({
  apiUrl: FHIR_API_URL,
  useMockData: shouldUseMockData(),
  mode: shouldUseMockData() ? 'DEVELOPMENT' : 'PRODUCTION',
});
