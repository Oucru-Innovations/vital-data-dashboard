/**
 * GroupFilter Component
 *
 * Dropdown filter for selecting patient groups (study arms) in recruitment tracking.
 * Allows filtering patients by their assigned group in the study.
 *
 * This component integrates with Redux to manage group selection state,
 * taking available groups dynamically from the currently selected study.
 *
 * STATE MANAGEMENT:
 * =================
 * Uses Redux store (studySlice) to persist group selection.
 * Available groups are derived from currentStudy.group or currentStudy.comparisonGroup.
 * When group changes, triggers data refresh in parent components.
 *
 * USAGE:
 * ======
 * <GroupFilter />
 * <GroupFilter size="small" showLabel={false} />
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
} from '@mui/material';
import {
  selectCurrentGroup,
  setCurrentGroup,
  clearCurrentGroup,
  selectCurrentStudy,
} from '../../store/studySlice';

/**
 * GroupFilter Component
 *
 * @param {Object} props - Component props
 * @param {string} props.size - MUI Select size: 'small' | 'medium' (default: 'small')
 * @param {boolean} props.showLabel - Whether to show the label (default: true)
 * @param {Object} props.sx - Optional MUI sx prop for styling
 * @param {boolean} props.disabled - Whether the filter is disabled (default: false)
 * @returns {JSX.Element} Group filter dropdown
 */
const GroupFilter = ({
  size = 'small',
  showLabel = true,
  sx = {},
  disabled = false,
}) => {
  // ===== REDUX STATE =====

  /**
   * Get current group selection and current study from Redux
   */
  const currentGroup = useSelector(selectCurrentGroup);
  const currentStudy = useSelector(selectCurrentStudy);

  /**
   * Redux dispatch for updating group
   */
  const dispatch = useDispatch();

  // ===== GROUP OPTIONS =====

  /**
   * Extract groups from the current study
   * Supports both 'group' and 'comparisonGroup' properties
   */
  const studyGroups = currentStudy?.group || currentStudy?.comparisonGroup || [];

  /**
   * Generate available group options
   * Includes a default 'All Groups' option followed by dynamic study groups
   */
  const groupOptions = [
    {
      value: 'all',
      label: 'All Groups',
      description: 'Show all patients regardless of group',
      color: 'default',
    },
    ...studyGroups.map((group, index) => ({
      value: group.name,
      label: group.name,
      description: group.description || `Study group: ${group.name}`,
      // Cycle through some colors for variety
      color: index % 2 === 0 ? 'primary' : 'secondary',
      originalGroup: group, // Keep reference to original object
    })),
  ];

  // ===== EVENT HANDLERS =====

  /**
   * Handle group selection change
   *
   * Updates Redux state when user selects a group.
   * Dispatches either setCurrentGroup (with object) or clearCurrentGroup.
   *
   * @param {Object} event - MUI Select change event
   */
  const handleGroupChange = (event) => {
    const value = event.target.value;

    if (!value || value === 'all') {
      // Clear group filter
      console.log('[GroupFilter] Clearing group filter');
      dispatch(clearCurrentGroup());
    } else {
      // Find the group object and set it
      const option = groupOptions.find((opt) => opt.value === value);
      if (option && option.originalGroup) {
        console.log(`[GroupFilter] Setting group: ${value}`);
        dispatch(setCurrentGroup(option.originalGroup));
      }
    }
  };

  // ===== RENDER =====

  /**
   * Get current selection value for the MUI Select
   * If currentGroup exists, use its name; otherwise use 'all'
   */
  const selectValue = currentGroup?.name || 'all';

  // If no study is selected, the filter should be disabled or show no options
  const isDisabled = disabled || !currentStudy;

  return (
    <FormControl
      sx={{ minWidth: 200, ...sx }}
      size={size}
      disabled={isDisabled}
    >
      {/* Label */}
      {showLabel && (
        <InputLabel id="group-filter-label">
          Group
        </InputLabel>
      )}

      {/* Dropdown */}
      <Select
        labelId="group-filter-label"
        id="group-filter"
        value={selectValue}
        label={showLabel ? 'Group' : undefined}
        onChange={handleGroupChange}
        displayEmpty={!showLabel}
        MenuProps={{
          anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
          transformOrigin: { vertical: 'top', horizontal: 'left' },
          PaperProps: { sx: { minWidth: 280 } },
        }}
        renderValue={(selected) => {
          // Custom render for the selected value
          if (!selected || selected === 'all') {
            return <em style={{ color: '#999' }}>All Groups</em>;
          }

          const option = groupOptions.find((opt) => opt.value === selected);
          return (
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={option?.label}
                size="small"
                color={option?.color || 'primary'}
                sx={{ height: 20 }}
              />
            </Box>
          );
        }}
      >
        {/* All Groups Option */}
        <MenuItem value="all">
          <Box display="flex" flexDirection="column" width="100%">
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label="All Groups"
                size="small"
                color="default"
                sx={{ height: 20 }}
              />
            </Box>
            <Box
              sx={{
                fontSize: '0.75rem',
                color: 'text.secondary',
                mt: 0.5,
                pl: 4,
              }}
            >
              Show all patients regardless of group
            </Box>
          </Box>
        </MenuItem>

        {/* Dynamic Study Groups */}
        {studyGroups.length === 0 && (
          <MenuItem disabled value="">
            <em style={{ color: '#999' }}>No groups defined for this study</em>
          </MenuItem>
        )}

        {groupOptions.filter(opt => opt.value !== 'all').map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
          >
            <Box display="flex" flexDirection="column" width="100%">
              {/* Primary line: Label with chip */}
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={option.label}
                  size="small"
                  color={option.color}
                  sx={{ height: 20 }}
                />
              </Box>

              {/* Secondary line: Description */}
              {option.description && (
                <Box
                  sx={{
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    mt: 0.5,
                    pl: 4,
                  }}
                >
                  {option.description}
                </Box>
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default GroupFilter;
