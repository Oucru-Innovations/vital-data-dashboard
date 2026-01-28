/**
 * WardSelection Component
 *
 * Dropdown component for selecting a ward (department) in the tracking dashboard.
 * This component implements the most specific level of cascading filter logic:
 * - Wards are filtered based on BOTH study AND site selections
 * - Uses alias pattern matching: ${studyCode}-${siteCode}-${wardNumber}
 * - The component is disabled when study OR site is not selected
 * - Changing study or site clears the ward selection
 *
 * Ward Alias Pattern:
 * - Format: "56EI-003-1" means Study 56EI, Site 003, Ward 1
 * - Example aliases: ["HTD AICU", "56EI-003-1", "56EI-003-2"]
 * - We match against the pattern: startsWith("56EI-003-")
 *
 * Data Flow:
 * 1. User selects study + site → Redux state updated
 * 2. This component detects study/site change via useEffect
 * 3. Fetches all wards from FHIR (mock in dev, API in prod)
 * 4. Filters wards by alias pattern: ${studyCode}-${siteCode}-*
 * 5. Displays filtered wards in dropdown
 * 6. User selects ward → Updates Redux state
 * 7. selectAlias selector builds complete filter pattern
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
  Chip,
} from '@mui/material';

// Redux state management
import {
  selectCurrentStudy,
  selectCurrentSite,
  selectCurrentWard,
  setCurrentWard,
} from '../../store/studySlice';

// FHIR API service for fetching ward data
import { getProcessedWards, isDevelopmentMode } from '../../services/fhirService';

/**
 * WardSelection Component
 *
 * @param {Object} props - Component props
 * @param {Object} props.sx - Optional MUI sx prop for styling
 * @param {boolean} props.showLabel - Whether to show the label (default: true)
 * @param {string} props.size - MUI Select size: 'small' | 'medium' (default: 'small')
 * @param {string} props.variant - MUI Select variant: 'outlined' | 'filled' | 'standard' (default: 'outlined')
 * @param {boolean} props.showMatchedAlias - Whether to show matched alias as chip (default: true)
 * @returns {JSX.Element} Ward selection dropdown
 */
const WardSelection = ({
  sx = {},
  showLabel = true,
  size = 'small',
  variant = 'outlined',
  showMatchedAlias = true,
}) => {
  // ===== STATE MANAGEMENT =====

  /**
   * Redux State - Current study selection
   * Ward dropdown depends on study for alias pattern matching
   */
  const currentStudy = useSelector(selectCurrentStudy);

  /**
   * Redux State - Current site selection
   * Ward dropdown depends on site for alias pattern matching
   */
  const currentSite = useSelector(selectCurrentSite);

  /**
   * Redux State - Current ward selection
   * Used to set the dropdown value
   */
  const currentWard = useSelector(selectCurrentWard);

  /**
   * Redux Dispatch - For updating ward selection
   */
  const dispatch = useDispatch();

  /**
   * Local State - All available wards from FHIR
   * This is the unfiltered list fetched from API/mock data
   */
  const [allWards, setAllWards] = useState([]);

  /**
   * Local State - Filtered wards based on study+site
   * This is what actually gets displayed in the dropdown
   * Each ward includes a 'matchedAlias' field for display
   */
  const [filteredWards, setFilteredWards] = useState([]);

  /**
   * Local State - Loading indicator
   * True while fetching wards from FHIR service
   */
  const [loading, setLoading] = useState(false);

  /**
   * Local State - Error message
   * Stores error message if fetch fails
   */
  const [error, setError] = useState(null);

  // ===== EFFECTS =====

  /**
   * Effect: Fetch all wards on component mount
   *
   * This runs once when the component first renders.
   * Fetches all available wards from FHIR (mock or API based on environment).
   *
   * Data Source:
   * - DEVELOPMENT: src/mockData/fhir/getOrganizationWard.json
   * - PRODUCTION: GET /Organization?type=dept
   *
   * Note: We fetch all wards upfront rather than filtering by site on the server
   * because the filtering logic is complex (alias pattern matching) and better
   * done client-side.
   */
  useEffect(() => {
    const fetchWards = async () => {
      try {
        setLoading(true);
        setError(null);

        // Log mode for debugging
        const mode = isDevelopmentMode() ? 'MOCK DATA' : 'FHIR API';
        console.log(`[WardSelection] Fetching wards using ${mode}`);

        // Fetch and preprocess wards
        // Returns array of {id, name, code, alias[]} objects
        const wards = await getProcessedWards();

        console.log(`[WardSelection] Loaded ${wards.length} wards`);
        setAllWards(wards);
      } catch (err) {
        console.error('[WardSelection] Error fetching wards:', err);
        setError('Failed to load wards. Please try again.');
        setAllWards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWards();
  }, []); // Empty dependency array = run once on mount

  /**
   * Effect: Filter wards when study, site, or allWards changes
   *
   * This implements the core ward filtering logic using alias pattern matching.
   *
   * ALGORITHM:
   *
   * 1. IF no study OR no site selected:
   *    - Clear filtered wards (dropdown disabled)
   *    - Clear current ward selection if exists
   *
   * 2. IF study AND site selected:
   *    - Build prefix pattern: "${studyCode}-${siteCode}-"
   *    - Example: "56EI-003-"
   *    - Filter wards where ANY alias starts with this prefix
   *    - Extract the matched alias for display
   *
   * 3. VALIDATION:
   *    - If current ward is no longer in filtered list
   *    - Clear the ward selection (it's invalid for this study-site combo)
   *
   * EXAMPLE:
   * Study: "56EI", Site: "003"
   * Prefix: "56EI-003-"
   * Ward aliases: ["HTD AICU", "56EI-003-1", "56EI-003-2", "00EI-003-0"]
   * Matched: ["56EI-003-1", "56EI-003-2"] → Ward included
   * Display: "HTD Adult ICU (56EI-003-1)"
   */
  useEffect(() => {
    // Both study AND site must be selected
    if (!currentStudy || !currentSite) {
      setFilteredWards([]);

      // Clear ward if one was selected
      if (currentWard) {
        dispatch(setCurrentWard(null));
      }
      return;
    }

    /**
     * Build the alias prefix for filtering
     * Format: ${studyCode}-${siteCode}-
     * Example: "56EI-003-"
     *
     * This prefix will match wards like:
     * - "56EI-003-1" (Ward 1)
     * - "56EI-003-2" (Ward 2)
     * - "56EI-003-AICU" (Adult ICU)
     */
    const aliasPrefix = `${currentStudy.studyCode}-${currentSite.code}-`;

    console.log(`[WardSelection] Filtering wards with prefix: ${aliasPrefix}`);

    /**
     * Filter wards and extract matched aliases
     *
     * For each ward:
     * 1. Check if ANY of its aliases start with our prefix
     * 2. If yes, include the ward
     * 3. Store the matched alias for display
     *
     * Ward structure:
     * {
     *   id: "AICUWardExample",
     *   name: "HTD Adult ICU",
     *   code: "003-001",
     *   alias: ["HTD AICU", "00EI-003-0", "56EI-003-1", "56EI-003-2"]
     * }
     *
     * After filtering and processing:
     * {
     *   ...wardFields,
     *   matchedAlias: "56EI-003-1"  // First matching alias
     * }
     */
    const wardsToShow = allWards
      .map((ward) => {
        // Find the first alias that matches our prefix
        const matchedAlias = ward.alias?.find((alias) =>
          alias.startsWith(aliasPrefix)
        );

        // If found a match, return ward with matched alias
        if (matchedAlias) {
          return {
            ...ward,
            matchedAlias, // Add matched alias for display
          };
        }

        return null;
      })
      .filter(Boolean); // Remove null entries (wards with no matching alias)

    console.log(
      `[WardSelection] Filtered to ${wardsToShow.length} wards for ${aliasPrefix}*`
    );

    setFilteredWards(wardsToShow);

    /**
     * Validation: Check if current ward is still valid
     *
     * If user had a ward selected and changed the study or site,
     * we need to verify the ward is still valid for the new combination.
     * If not, clear the selection.
     */
    if (currentWard && allWards.length > 0) {
      const isWardStillValid = wardsToShow.some((ward) => ward.id === currentWard.id);

      if (!isWardStillValid) {
        console.log(
          `[WardSelection] Current ward ${currentWard.code} not valid for ${aliasPrefix}*, clearing`
        );
        dispatch(setCurrentWard(null));
      }
    }
  }, [currentStudy, currentSite, allWards, currentWard, dispatch]);

  // ===== EVENT HANDLERS =====

  /**
   * Handle ward selection change
   *
   * When user selects a ward from the dropdown:
   * 1. Find the full ward object (including matchedAlias) by ID
   * 2. Dispatch setCurrentWard action to update Redux
   * 3. The selectAlias selector will now return the ward's matchedAlias
   * 4. This alias is used for filtering patient data
   *
   * @param {Object} event - MUI Select change event
   * @param {string} event.target.value - Selected ward ID
   */
  const handleWardChange = (event) => {
    const wardId = event.target.value;

    if (!wardId) {
      // User selected "Clear" or empty option
      dispatch(setCurrentWard(null));
      return;
    }

    // Find the full ward object (includes matchedAlias)
    const selectedWard = filteredWards.find((ward) => ward.id === wardId);

    if (selectedWard) {
      console.log(
        `[WardSelection] Selected ward: ${selectedWard.name} (${selectedWard.matchedAlias})`
      );
      dispatch(setCurrentWard(selectedWard));
    }
  };

  // ===== COMPUTED VALUES =====

  /**
   * Determine if the dropdown should be disabled
   *
   * Disabled when:
   * - No study is selected (wards depend on study)
   * - No site is selected (wards depend on site)
   * - Currently loading wards
   * - An error occurred during fetch
   */
  const isDisabled = !currentStudy || !currentSite || loading || !!error;

  /**
   * Get the current value for the Select component
   * Returns the ward ID or empty string if no ward selected
   */
  const selectValue = currentWard?.id || '';

  /**
   * Get helper text based on current state
   */
  const getHelperText = () => {
    if (isDevelopmentMode()) {
      return 'Using mock data (development)';
    }
    if (!currentStudy) {
      return 'Select a study first';
    }
    if (!currentSite) {
      return 'Select a site first';
    }
    return '';
  };

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
        <InputLabel id="ward-selection-label">
          Ward {loading && '(Loading...)'}
        </InputLabel>
      )}

      {/* Dropdown */}
      <Select
        labelId="ward-selection-label"
        id="ward-selection"
        value={selectValue}
        label={showLabel ? 'Ward' : undefined}
        onChange={handleWardChange}
        variant={variant}
        displayEmpty={!showLabel}
        renderValue={(selected) => {
          // Custom render for the selected value
          if (!selected) {
            return <em style={{ color: '#999' }}>Select Ward</em>;
          }
          const ward = filteredWards.find((w) => w.id === selected);
          if (!ward) return selected;

          // Display: "Ward Name (Alias)"
          return (
            <Box display="flex" alignItems="center" gap={1}>
              <span>{ward.name}</span>
              {showMatchedAlias && ward.matchedAlias && (
                <Chip label={ward.matchedAlias} size="small" variant="outlined" />
              )}
            </Box>
          );
        }}
      >
        {/* Loading indicator */}
        {loading && (
          <MenuItem disabled>
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={16} />
              <Typography variant="body2">Loading wards...</Typography>
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

        {/* Empty state - No site selected */}
        {currentStudy && !currentSite && !loading && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              Please select a site first
            </Typography>
          </MenuItem>
        )}

        {/* Empty state - No wards available for study-site combination */}
        {currentStudy &&
          currentSite &&
          !loading &&
          !error &&
          filteredWards.length === 0 && (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                No wards available for {currentStudy.studyCode}-{currentSite.code}
              </Typography>
            </MenuItem>
          )}

        {/* Clear option - shown when a ward is selected */}
        {currentWard && filteredWards.length > 0 && (
          <MenuItem value="">
            <em>Clear Selection</em>
          </MenuItem>
        )}

        {/* Ward options */}
        {!loading &&
          !error &&
          filteredWards.map((ward) => (
            <MenuItem key={ward.id} value={ward.id}>
              <Box display="flex" flexDirection="column" width="100%">
                {/* Primary text: Ward name */}
                <Typography variant="body2">{ward.name}</Typography>

                {/* Secondary text: Matched alias and code */}
                <Box display="flex" gap={1} alignItems="center">
                  {ward.matchedAlias && (
                    <Chip
                      label={ward.matchedAlias}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20 }}
                    />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Code: {ward.code}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
      </Select>

      {/* Helper text */}
      {getHelperText() && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
          {getHelperText()}
        </Typography>
      )}
    </FormControl>
  );
};

export default WardSelection;
