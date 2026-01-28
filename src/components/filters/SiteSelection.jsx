/**
 * SiteSelection Component
 *
 * Dropdown component for selecting a site (hospital) in the tracking dashboard.
 * This component implements cascading filter logic where:
 * - Sites are filtered based on the currently selected study
 * - Only sites referenced in the study's site array are shown
 * - The component is disabled when no study is selected
 * - Changing the study clears the site selection if it's no longer valid
 *
 * Data Flow:
 * 1. User selects a study → MonthlyReport updates Redux
 * 2. This component detects study change via useEffect
 * 3. Fetches all sites from FHIR (mock in dev, API in prod)
 * 4. Filters sites based on study.site references
 * 5. Displays filtered sites in dropdown
 * 6. User selects site → Updates Redux state
 * 7. Triggers WardSelection to fetch/filter wards
 *
 * Environment-Based Behavior:
 * - DEVELOPMENT (localhost): Uses mock JSON data
 * - PRODUCTION: Calls real FHIR API endpoints
 */

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';

// Redux state management
import {
  selectCurrentStudy,
  selectCurrentSite,
  setSite,
} from '../../store/studySlice';

// FHIR API service for fetching site data
import { getProcessedSites, isDevelopmentMode } from '../../services/fhirService';

/**
 * SiteSelection Component
 *
 * @param {Object} props - Component props
 * @param {Object} props.sx - Optional MUI sx prop for styling
 * @param {boolean} props.showLabel - Whether to show the label (default: true)
 * @param {string} props.size - MUI Select size: 'small' | 'medium' (default: 'small')
 * @param {string} props.variant - MUI Select variant: 'outlined' | 'filled' | 'standard' (default: 'outlined')
 * @returns {JSX.Element} Site selection dropdown
 */
const SiteSelection = ({
  sx = {},
  showLabel = true,
  size = 'small',
  variant = 'outlined',
}) => {
  // ===== STATE MANAGEMENT =====

  /**
   * Redux State - Current study selection
   * The site dropdown depends on this value to filter available sites
   */
  const currentStudy = useSelector(selectCurrentStudy);

  /**
   * Redux State - Current site selection
   * Used to set the dropdown value
   */
  const currentSite = useSelector(selectCurrentSite);

  /**
   * Redux Dispatch - For updating site selection
   */
  const dispatch = useDispatch();

  /**
   * Local State - All available sites from FHIR
   * This is the unfiltered list fetched from API/mock data
   */
  const [allSites, setAllSites] = useState([]);

  /**
   * Local State - Filtered sites based on current study
   * This is what actually gets displayed in the dropdown
   */
  const [filteredSites, setFilteredSites] = useState([]);

  /**
   * Local State - Loading indicator
   * True while fetching sites from FHIR service
   */
  const [loading, setLoading] = useState(false);

  /**
   * Local State - Error message
   * Stores error message if fetch fails
   */
  const [error, setError] = useState(null);

  // ===== EFFECTS =====

  /**
   * Effect: Fetch all sites on component mount
   *
   * This runs once when the component first renders.
   * Fetches all available sites from FHIR (mock or API based on environment).
   *
   * Data Source:
   * - DEVELOPMENT: src/mockData/fhir/getOrganizationHospital.json
   * - PRODUCTION: GET /Organization?type=prov
   */
  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoading(true);
        setError(null);

        // Log mode for debugging
        const mode = isDevelopmentMode() ? 'MOCK DATA' : 'FHIR API';
        console.log(`[SiteSelection] Fetching sites using ${mode}`);

        // Fetch and preprocess sites
        // Returns array of {id, name, code, alias} objects
        const sites = await getProcessedSites();

        console.log(`[SiteSelection] Loaded ${sites.length} sites`);
        setAllSites(sites);
      } catch (err) {
        console.error('[SiteSelection] Error fetching sites:', err);
        setError('Failed to load sites. Please try again.');
        setAllSites([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, []); // Empty dependency array = run once on mount

  /**
   * Effect: Filter sites based on study selection using ALIAS PATTERN MATCHING
   *
   * This implements the core filtering logic using alias patterns from FHIR data.
   *
   * ALIAS PATTERN STRUCTURE:
   * =========================
   * Hospital aliases follow the hierarchical pattern: {studyCode}-{siteCode}-{wardCode}-{patientCode}
   *
   * Examples from FHIR data:
   * - "54EI-003-" → Study: 54EI, Site: 003
   * - "56EI-057-" → Study: 56EI, Site: 057
   * - "24EI-003-" → Study: 24EI, Site: 003
   *
   * A single hospital can participate in multiple studies, so it will have multiple aliases:
   * Hospital for Tropical Diseases aliases: ["HTD", "54EI-003-", "56EI-003-", "24EI-003-", ...]
   *
   * FILTERING LOGIC:
   * ================
   * IF no study selected:
   *   - Clear filtered sites (dropdown disabled)
   *   - Clear current site selection if exists
   *
   * IF study selected:
   *   - Build alias prefix: "{studyCode}-" (e.g., "54EI-")
   *   - Filter sites: Check if ANY alias starts with the prefix
   *   - Extract site code from matched alias (remove prefix and trailing dash)
   *   - Example: "54EI-003-" → prefix "54EI-" → siteCode "003"
   *
   * ADVANTAGES OF ALIAS MATCHING:
   * ==============================
   * 1. Works without study.site references in FHIR
   * 2. Automatically discovers which hospitals participate in which studies
   * 3. Provides site codes for each study-hospital combination
   * 4. Handles multi-study hospitals correctly
   *
   * VALIDATION:
   * ===========
   * - If current site is no longer in filtered list
   * - Clear the site selection (it's invalid for this study)
   */
  useEffect(() => {
    // No study selected → clear everything
    if (!currentStudy) {
      setFilteredSites([]);

      // Clear site if one was selected
      if (currentSite) {
        dispatch(setSite(null));
      }
      return;
    }

    // Study selected → filter sites by alias pattern
    let sitesToShow = [];

    /**
     * ALIAS PATTERN MATCHING ALGORITHM
     * =================================
     *
     * Step 1: Build the search prefix
     * - Format: "{studyCode}-"
     * - Example: If studyCode is "54EI", prefix is "54EI-"
     *
     * Step 2: Check each site's aliases
     * - Loop through all sites from FHIR
     * - For each site, examine its alias array
     * - Look for any alias starting with our prefix
     *
     * Step 3: Extract site code
     * - From matched alias "54EI-003-"
     * - Remove prefix "54EI-" → "003-"
     * - Remove trailing dash → "003"
     * - This is the site code for this study
     *
     * Step 4: Build filtered result
     * - Include site in results with:
     *   - Original site data (id, name, etc.)
     *   - matchedAlias: The alias that matched (for debugging/display)
     *   - code: The extracted site code (overrides original)
     */
    const aliasPrefix = `${currentStudy.studyCode}-`;
    console.log(`[SiteSelection] Filtering sites by alias prefix: "${aliasPrefix}"`);

    sitesToShow = allSites
      .map((site) => {
        // Check if this site has any alias matching the current study
        // site.alias is an array like: ["HTD", "54EI-003-", "56EI-003-"]
        const matchedAlias = site.alias?.find((alias) =>
          alias.startsWith(aliasPrefix)
        );

        if (matchedAlias) {
          // Found a match! Extract the site code from the alias
          // Example: "54EI-003-" → "003"
          const siteCode = matchedAlias
            .replace(aliasPrefix, '')  // Remove "54EI-" → "003-"
            .replace(/-$/, '');         // Remove trailing "-" → "003"

          console.log(
            `[SiteSelection] Matched: ${site.name} | alias: "${matchedAlias}" | siteCode: "${siteCode}"`
          );

          // Return site with extracted code and matched alias
          return {
            ...site,
            matchedAlias,  // Store for display/debugging (e.g., "54EI-003-")
            code: siteCode // Override code with extracted value (e.g., "003")
          };
        }

        // No matching alias for this study → exclude this site
        return null;
      })
      .filter(Boolean); // Remove null entries (sites without matching aliases)

    console.log(
      `[SiteSelection] Found ${sitesToShow.length} sites for study ${currentStudy.studyCode}`
    );

    // Debug: Show sample of matched sites
    if (sitesToShow.length > 0) {
      console.log('[SiteSelection] Sample matched sites:',
        sitesToShow.slice(0, 3).map(s => ({
          name: s.name,
          matchedAlias: s.matchedAlias,
          siteCode: s.code
        }))
      );
    }

    setFilteredSites(sitesToShow);

    /**
     * VALIDATION: Check if current site is still valid
     *
     * If user had a site selected and then changed the study,
     * we need to verify the site is still valid for the new study.
     * If the site doesn't have an alias for the new study, clear the selection.
     */
    if (currentSite && allSites.length > 0) {
      const isSiteStillValid = sitesToShow.some((site) => site.id === currentSite.id);

      if (!isSiteStillValid) {
        console.log(
          `[SiteSelection] Current site "${currentSite.name}" not valid for study ${currentStudy.studyCode}, clearing`
        );
        dispatch(setSite(null));
      }
    }
  }, [currentStudy, allSites, currentSite, dispatch]);

  // ===== EVENT HANDLERS =====

  /**
   * Handle site selection change
   *
   * When user selects a site from the dropdown:
   * 1. Find the full site object by ID
   * 2. Dispatch setSite action to update Redux
   * 3. This will trigger WardSelection to fetch/filter wards
   * 4. The setSite action automatically clears ward selection
   *
   * @param {Object} event - MUI Select change event
   * @param {string} event.target.value - Selected site ID
   */
  const handleSiteChange = (event) => {
    const siteId = event.target.value;

    if (!siteId) {
      // User selected "Clear" or empty option
      dispatch(setSite(null));
      return;
    }

    // Find the full site object
    const selectedSite = filteredSites.find((site) => site.id === siteId);

    if (selectedSite) {
      console.log(`[SiteSelection] Selected site: ${selectedSite.name} (${selectedSite.code})`);
      dispatch(setSite(selectedSite));
    }
  };

  // ===== COMPUTED VALUES =====

  /**
   * Determine if the dropdown should be disabled
   *
   * Disabled when:
   * - No study is selected (sites depend on study)
   * - Currently loading sites
   * - An error occurred during fetch
   */
  const isDisabled = !currentStudy || loading || !!error;

  /**
   * Get the current value for the Select component
   * Returns the site ID or empty string if no site selected
   */
  const selectValue = currentSite?.id || '';

  // ===== RENDER =====

  return (
    <FormControl
      sx={{ minWidth: 200, ...sx }}
      size={size}
      disabled={isDisabled}
      error={!!error}
    >
      {/* Label */}
      {showLabel && (
        <InputLabel id="site-selection-label">
          Site {loading && '(Loading...)'}
        </InputLabel>
      )}

      {/* Dropdown */}
      <Select
        labelId="site-selection-label"
        id="site-selection"
        value={selectValue}
        label={showLabel ? 'Site' : undefined}
        onChange={handleSiteChange}
        variant={variant}
        displayEmpty={!showLabel}
        renderValue={(selected) => {
          // Custom render for the selected value
          if (!selected) {
            return <em style={{ color: '#999' }}>Select Site</em>;
          }
          const site = filteredSites.find((s) => s.id === selected);
          return site ? `${site.code}` : selected;
        }}
      >
        {/* Loading indicator */}
        {loading && (
          <MenuItem disabled>
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={16} />
              <Typography variant="body2">Loading sites...</Typography>
            </Box>
          </MenuItem>
        )}

        {/* Error message */}
        {error && (
          <MenuItem disabled>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </MenuItem>
        )}

        {/* Empty state - No study selected */}
        {!currentStudy && !loading && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              Please select a study first
            </Typography>
          </MenuItem>
        )}

        {/* Empty state - No sites available for study */}
        {currentStudy && !loading && !error && filteredSites.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No sites available for this study
            </Typography>
          </MenuItem>
        )}

        {/* Clear option - shown when a site is selected */}
        {currentSite && filteredSites.length > 0 && (
          <MenuItem value="">
            <em>Clear Selection</em>
          </MenuItem>
        )}

        {/* Site options */}
        {!loading &&
          !error &&
          filteredSites.map((site) => (
            <MenuItem key={site.id} value={site.id}>
              <Box>
                {/* Primary text: Site name and code */}
                <Typography variant="body2">
                  {site.name} ({site.code})
                </Typography>

                {/* Secondary text: Show first alias if available */}
                {site.alias && site.alias.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {site.alias[0]}
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))}
      </Select>

      {/* Helper text for development mode */}
      {isDevelopmentMode() && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
          Using mock data (development)
        </Typography>
      )}
    </FormControl>
  );
};

export default SiteSelection;
