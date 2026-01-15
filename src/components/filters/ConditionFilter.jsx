/**
 * ConditionFilter Component
 *
 * Dropdown filter for selecting patient condition in recruitment tracking.
 * Allows filtering patients by medical condition (e.g., CAP, VAP).
 *
 * This component integrates with Redux to manage condition selection state,
 * ensuring coordinated filtering across the application.
 *
 * CONDITIONS:
 * ===========
 * - CAP: Community Acquired Pneumonia (SNOMED: 385093006)
 * - VAP: Ventilator-Associated Pneumonia (SNOMED: 87828008)
 * - ALL: Show all patients regardless of condition
 *
 * STATE MANAGEMENT:
 * =================
 * Uses Redux store (studySlice) to persist condition selection.
 * When condition changes, triggers data refresh in parent components.
 *
 * USAGE:
 * ======
 * <ConditionFilter />
 * <ConditionFilter size="small" showLabel={false} />
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
  selectCurrentCondition,
  setCurrentCondition,
  clearCurrentCondition,
} from '../../store/studySlice';

/**
 * ConditionFilter Component
 *
 * @param {Object} props - Component props
 * @param {string} props.size - MUI Select size: 'small' | 'medium' (default: 'small')
 * @param {boolean} props.showLabel - Whether to show the label (default: true)
 * @param {Object} props.sx - Optional MUI sx prop for styling
 * @returns {JSX.Element} Condition filter dropdown
 */
const ConditionFilter = ({
  size = 'small',
  showLabel = true,
  sx = {},
}) => {
  // ===== REDUX STATE =====

  /**
   * Get current condition selection from Redux
   * Value can be: null, "CAP", "VAP"
   */
  const currentCondition = useSelector(selectCurrentCondition);

  /**
   * Redux dispatch for updating condition
   */
  const dispatch = useDispatch();

  // ===== CONDITION OPTIONS =====

  /**
   * Available condition options
   * Each option includes display text, value, description, and color coding
   */
  const conditionOptions = [
    {
      value: null,
      label: 'All Conditions',
      description: 'Show all patients regardless of condition',
      color: 'default',
    },
    {
      value: 'CAP',
      label: 'CAP',
      fullLabel: 'Community Acquired Pneumonia',
      description: 'Pneumonia acquired outside hospital setting',
      color: 'primary',
      snomedCode: '385093006',
    },
    {
      value: 'VAP',
      label: 'VAP',
      fullLabel: 'Ventilator-Associated Pneumonia',
      description: 'Pneumonia in patients on mechanical ventilation',
      color: 'secondary',
      snomedCode: '87828008',
    },
  ];

  // ===== EVENT HANDLERS =====

  /**
   * Handle condition selection change
   *
   * Updates Redux state when user selects a condition.
   * Dispatches either setCurrentCondition or clearCurrentCondition.
   *
   * @param {Object} event - MUI Select change event
   */
  const handleConditionChange = (event) => {
    const value = event.target.value;

    if (!value || value === 'all') {
      // Clear condition filter
      console.log('[ConditionFilter] Clearing condition filter');
      dispatch(clearCurrentCondition());
    } else {
      // Set specific condition
      console.log(`[ConditionFilter] Setting condition: ${value}`);
      dispatch(setCurrentCondition(value));
    }
  };

  // ===== RENDER =====

  /**
   * Get current selection value
   * Convert null to empty string for MUI Select
   */
  const selectValue = currentCondition || '';

  /**
   * Find the selected option for custom rendering
   */
  const selectedOption = conditionOptions.find((opt) => opt.value === currentCondition);

  return (
    <FormControl
      sx={{ minWidth: 200, ...sx }}
      size={size}
    >
      {/* Label */}
      {showLabel && (
        <InputLabel id="condition-filter-label">
          Condition
        </InputLabel>
      )}

      {/* Dropdown */}
      <Select
        labelId="condition-filter-label"
        id="condition-filter"
        value={selectValue}
        label={showLabel ? 'Condition' : undefined}
        onChange={handleConditionChange}
        displayEmpty={!showLabel}
        renderValue={(selected) => {
          // Custom render for the selected value
          if (!selected) {
            return <em style={{ color: '#999' }}>All Conditions</em>;
          }

          const option = conditionOptions.find((opt) => opt.value === selected);
          return (
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={option?.label}
                size="small"
                color={option?.color}
                sx={{ height: 20 }}
              />
              {option?.fullLabel && (
                <span style={{ fontSize: '0.875rem' }}>
                  {option.fullLabel}
                </span>
              )}
            </Box>
          );
        }}
      >
        {/* Condition Options */}
        {conditionOptions.map((option) => (
          <MenuItem
            key={option.value || 'all'}
            value={option.value || ''}
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
                {option.fullLabel && (
                  <span style={{ fontWeight: 500 }}>
                    {option.fullLabel}
                  </span>
                )}
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
                  {option.snomedCode && (
                    <span style={{ marginLeft: 8, color: '#999' }}>
                      (SNOMED: {option.snomedCode})
                    </span>
                  )}
                </Box>
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default ConditionFilter;
