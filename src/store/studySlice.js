/**
 * Redux Slice for Study, Site, and Ward State Management
 *
 * This slice manages the filter selections for study, site, and ward in the tracking dashboard.
 * It follows a cascading dependency model similar to vital-log-frontend:
 *
 * Study → Site → Ward
 *
 * When a parent selection changes, all dependent children are cleared to maintain data integrity.
 * For example:
 * - Changing study clears both site and ward
 * - Changing site clears only ward
 *
 * Data Structure:
 * - currentStudy: {id, name, studyCode, status, site[]} - Full study object from FHIR/API
 * - currentSite: {id, name, code, alias[]} - Site/hospital organization
 * - currentWard: {id, name, code, alias[]} - Ward/department organization
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Currently selected study object
  // Contains: id, name, studyCode (e.g., "54EI"), status, site references
  currentStudy: null,

  // Currently selected site object (hospital)
  // Contains: id, name, code (e.g., "003"), alias array
  // Type: Organization with type=prov (provider)
  currentSite: null,

  // Currently selected ward object (department)
  // Contains: id, name, code, alias array with format: ${studyCode}-${siteCode}-${wardNumber}
  // Type: Organization with type=dept (department)
  currentWard: null,

  // Currently selected condition for screening data filtering
  // Used in screening/recruitment tracking to filter by patient condition
  // Example: "Sepsis", "COVID-19", "Influenza"
  // Conditions are defined in the ResearchStudy.condition field
  currentCondition: null,

  // Currently selected patient group for screening data filtering
  // Used to distinguish between treatment groups in clinical trials
  // Example: "A", "B", "Control", "Treatment"
  // Groups are defined in the ResearchStudy.comparisonGroup field
  currentGroup: null,
};

const studySlice = createSlice({
  name: 'study',
  initialState,
  reducers: {
    /**
     * Set the current study selection
     *
     * This action clears all dependent selections (site and ward) to ensure
     * that only valid combinations are maintained.
     *
     * @param {Object} state - Current Redux state
     * @param {Object} action.payload - Study object from API or null to clear
     * @param {string} action.payload.id - Study unique identifier
     * @param {string} action.payload.name - Study name
     * @param {string} action.payload.studyCode - Study code (e.g., "54EI")
     * @param {string} action.payload.status - Study status ("active", "completed", etc.)
     * @param {Array} action.payload.site - Array of site references [{reference: "Organization/ID"}]
     */
    setStudy: (state, action) => {
      state.currentStudy = action.payload;

      // Clear dependent selections when study changes
      // This ensures site, ward, condition, and group are always valid for the selected study
      state.currentSite = null;
      state.currentWard = null;
      state.currentCondition = null;
      state.currentGroup = null;
    },

    /**
     * Set the current site selection
     *
     * This action clears the ward selection since wards are dependent on
     * both study and site selections.
     *
     * @param {Object} state - Current Redux state
     * @param {Object} action.payload - Site object from API or null to clear
     * @param {string} action.payload.id - Site unique identifier
     * @param {string} action.payload.name - Site/hospital name
     * @param {string} action.payload.code - Site code (e.g., "003", "057")
     * @param {Array} action.payload.alias - Array of site aliases
     */
    setSite: (state, action) => {
      state.currentSite = action.payload;

      // Clear ward when site changes since wards are filtered by study-site combination
      state.currentWard = null;
    },

    /**
     * Set the current ward selection
     *
     * Ward selection is only valid when both study and site are selected.
     * The ward must have an alias matching the pattern: ${studyCode}-${siteCode}-${wardNumber}
     *
     * @param {Object} state - Current Redux state
     * @param {Object} action.payload - Ward object from API or null to clear
     * @param {string} action.payload.id - Ward unique identifier
     * @param {string} action.payload.name - Ward/department name
     * @param {string} action.payload.code - Ward code
     * @param {Array} action.payload.alias - Array of ward aliases including study-site patterns
     */
    setCurrentWard: (state, action) => {
      state.currentWard = action.payload;
    },

    /**
     * Clear the ward selection
     *
     * Useful when you want to clear only the ward without affecting study or site.
     * For example, when filtering data at the site level without ward specificity.
     */
    clearWard: (state) => {
      state.currentWard = null;
    },

    /**
     * Set the current condition filter
     *
     * Used for screening data filtering by patient condition.
     * Conditions come from the ResearchStudy.condition field.
     *
     * @param {Object} state - Current Redux state
     * @param {string} action.payload - Condition name or null to clear
     */
    setCurrentCondition: (state, action) => {
      state.currentCondition = action.payload;
    },

    /**
     * Clear the condition selection
     *
     * Removes the condition filter while keeping other selections intact.
     */
    clearCurrentCondition: (state) => {
      state.currentCondition = null;
    },

    /**
     * Set the current patient group filter
     *
     * Used for screening data filtering by patient group (treatment arms).
     * Groups come from the ResearchStudy.comparisonGroup field.
     *
     * @param {Object} state - Current Redux state
     * @param {string} action.payload - Group name (e.g., "A", "B") or null to clear
     */
    setCurrentGroup: (state, action) => {
      state.currentGroup = action.payload;
    },

    /**
     * Clear the group selection
     *
     * Removes the group filter while keeping other selections intact.
     */
    clearCurrentGroup: (state) => {
      state.currentGroup = null;
    },

    /**
     * Clear all selections
     *
     * Resets the entire filter state to initial values.
     * Useful for "Clear All Filters" functionality.
     */
    clearAllSelections: (state) => {
      state.currentStudy = null;
      state.currentSite = null;
      state.currentWard = null;
      state.currentCondition = null;
      state.currentGroup = null;
    },
  },
});

// Export actions for use in components
export const {
  setStudy,
  setSite,
  setCurrentWard,
  clearWard,
  setCurrentCondition,
  clearCurrentCondition,
  setCurrentGroup,
  clearCurrentGroup,
  clearAllSelections,
} = studySlice.actions;

// Selector functions to access state in components
// These provide a clean interface for reading Redux state

/**
 * Get the currently selected study
 * @param {Object} state - Full Redux state
 * @returns {Object|null} Current study object or null
 */
export const selectCurrentStudy = (state) => state.study.currentStudy;

/**
 * Get the currently selected site
 * @param {Object} state - Full Redux state
 * @returns {Object|null} Current site object or null
 */
export const selectCurrentSite = (state) => state.study.currentSite;

/**
 * Get the currently selected ward
 * @param {Object} state - Full Redux state
 * @returns {Object|null} Current ward object or null
 */
export const selectCurrentWard = (state) => state.study.currentWard;

/**
 * Check if a study is selected
 * @param {Object} state - Full Redux state
 * @returns {boolean} True if study is selected
 */
export const hasStudySelected = (state) => state.study.currentStudy !== null;

/**
 * Check if a site is selected
 * @param {Object} state - Full Redux state
 * @returns {boolean} True if site is selected
 */
export const hasSiteSelected = (state) => state.study.currentSite !== null;

/**
 * Check if a ward is selected
 * @param {Object} state - Full Redux state
 * @returns {boolean} True if ward is selected
 */
export const hasWardSelected = (state) => state.study.currentWard !== null;

/**
 * Get the study code of the currently selected study
 * Useful for API calls and filtering
 * @param {Object} state - Full Redux state
 * @returns {string|null} Study code (e.g., "54EI") or null
 */
export const selectStudyCode = (state) =>
  state.study.currentStudy?.studyCode || null;

/**
 * Get the site code of the currently selected site
 * Useful for API calls and filtering
 * @param {Object} state - Full Redux state
 * @returns {string|null} Site code (e.g., "003") or null
 */
export const selectSiteCode = (state) =>
  state.study.currentSite?.code || null;

/**
 * Get the ward code of the currently selected ward
 * Useful for API calls and filtering
 * @param {Object} state - Full Redux state
 * @returns {string|null} Ward code or null
 */
export const selectWardCode = (state) =>
  state.study.currentWard?.code || null;

/**
 * Get the currently selected condition
 * @param {Object} state - Full Redux state
 * @returns {string|null} Current condition or null
 */
export const selectCurrentCondition = (state) => state.study.currentCondition;

/**
 * Get the currently selected group
 * @param {Object} state - Full Redux state
 * @returns {string|null} Current group or null
 */
export const selectCurrentGroup = (state) => state.study.currentGroup;

/**
 * COMPUTED SELECTOR: Get the alias pattern for filtering patient data
 *
 * This selector builds a hierarchical alias pattern based on current selections.
 * The pattern follows FHIR naming conventions used in patient identifiers and ward aliases.
 *
 * Returns patterns in order of specificity:
 * 1. Full ward alias (if study, site, AND ward selected): "56EI-003-1"
 *    - Uses the first alias from ward.alias array
 *    - Most specific filter - returns patients from specific ward only
 *
 * 2. Study-Site pattern (if study and site selected): "56EI-003"
 *    - Format: ${studyCode}-${siteCode}
 *    - Returns all patients from this study at this site (all wards)
 *
 * 3. Study pattern (if only study selected): "56EI"
 *    - Returns all patients in this study (all sites and wards)
 *
 * 4. null (if no study selected)
 *    - No filtering applied
 *
 * Usage Example:
 * const alias = useSelector(selectAlias);
 * // API call: /patients?identifier=${alias}
 * // This will filter patients matching the alias pattern
 *
 * The alias is used to match against:
 * - Participant.identifier.value in FHIR resources
 * - Ward Organization.alias arrays
 * - File naming patterns in data storage
 *
 * @param {Object} state - Full Redux state
 * @returns {string|null} Alias pattern for filtering or null
 */
export const selectAlias = (state) => {
  const { currentStudy, currentSite, currentWard } = state.study;

  // No study selected - no filtering
  if (!currentStudy) {
    return null;
  }

  // Only study selected - return study code
  // This will match all patients in the study across all sites
  if (!currentSite) {
    return currentStudy.studyCode;
  }

  // Study and site selected, check if ward is also selected
  if (currentWard && currentWard.alias && currentWard.alias.length > 0) {
    // Return the first alias from ward.alias array
    // Format: "56EI-003-1" (studyCode-siteCode-wardNumber)
    // This provides the most specific filter
    return currentWard.alias[0];
  }

  // Study and site selected, but no ward
  // Build study-site pattern: "56EI-003"
  // This matches all patients from this study at this specific site
  return `${currentStudy.studyCode}-${currentSite.code}`;
};

// Export the reducer as default for store configuration
export default studySlice.reducer;
