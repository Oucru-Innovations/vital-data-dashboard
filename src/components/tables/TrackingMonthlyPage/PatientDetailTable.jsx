/**
 * PatientDetailTable Component
 *
 * Displays detailed recruitment/screening data for individual patients.
 * Shows patient journey through screening, eligibility, and enrollment stages.
 *
 * FEATURES:
 * =========
 * - Sortable columns
 * - Status color coding
 * - Condition badges
 * - Expandable rows for progress timeline
 * - Empty state handling
 * - Loading state
 *
 * DATA STRUCTURE:
 * ==============
 * Expects array of patient objects from preprocessRecruitmentDetail():
 * [{
 *   id, screeningId, name, birthYear, condition, groups[],
 *   currentStatus, statusText, reason, startDate, lastUpdate,
 *   studyId, ward, progress[]
 * }]
 *
 * USAGE:
 * ======
 * <PatientDetailTable
 *   patients={patients}
 *   loading={false}
 *   onRefresh={() => fetchData()}
 * />
 */

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  Typography,
  IconButton,
  Collapse,
  TableSortLabel,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

/**
 * Get color for status badge
 *
 * Maps patient status to MUI color
 * @param {string} status - Status code
 * @returns {string} MUI color
 */
const getStatusColor = (status) => {
  const colorMap = {
    'on-study': 'success',      // Green - Enrolled
    eligible: 'info',            // Blue - Eligible
    screening: 'warning',        // Yellow - Screening
    'not-registered': 'error',   // Red - Not Registered
    retired: 'default',          // Gray - Retired
  };
  return colorMap[status] || 'default';
};

/**
 * Get color for condition badge
 *
 * @param {string} condition - Condition name
 * @returns {string} MUI color
 */
const getConditionColor = (condition) => {
  const colorMap = {
    CAP: 'primary',
    VAP: 'secondary',
  };
  return colorMap[condition] || 'default';
};

/**
 * PatientRow Component
 *
 * Single patient row with expandable progress timeline
 */
const PatientRow = ({ patient }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Main Row */}
      <TableRow hover>
        {/* Expand Button */}
        <TableCell>
          <IconButton
            size="small"
            onClick={() => setOpen(!open)}
            aria-label="expand row"
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>

        {/* Screening ID */}
        <TableCell>
          <Typography variant="body2" fontWeight="medium">
            {patient.screeningId || '-'}
          </Typography>
        </TableCell>

        {/* Name */}
        <TableCell>
          <Typography variant="body2">
            {patient.name}
          </Typography>
        </TableCell>

        {/* Condition */}
        <TableCell>
          <Chip
            label={patient.condition}
            size="small"
            color={getConditionColor(patient.condition)}
            sx={{ minWidth: 50 }}
          />
          {/* Show multiple groups if applicable */}
          {patient.groups && patient.groups.length > 1 && (
            <Box display="flex" gap={0.5} mt={0.5}>
              {patient.groups.map((group, idx) => (
                <Chip
                  key={idx}
                  label={group}
                  size="small"
                  variant="outlined"
                  sx={{ height: 18, fontSize: '0.7rem' }}
                />
              ))}
            </Box>
          )}
        </TableCell>

        {/* Current Status */}
        <TableCell>
          <Chip
            label={patient.statusText}
            size="small"
            color={getStatusColor(patient.currentStatus)}
            sx={{ minWidth: 100 }}
          />
        </TableCell>

        {/* Start Date */}
        <TableCell>
          <Typography variant="body2">
            {patient.startDate || '-'}
          </Typography>
        </TableCell>

        {/* Last Update */}
        <TableCell>
          <Typography variant="body2">
            {patient.lastUpdate || '-'}
          </Typography>
        </TableCell>

        {/* Study ID */}
        <TableCell>
          {patient.studyId ? (
            <Tooltip title="Enrolled - Study ID assigned">
              <Typography variant="body2" fontWeight="medium" color="success.main">
                {patient.studyId}
              </Typography>
            </Tooltip>
          ) : (
            <Typography variant="body2" color="text.secondary">
              -
            </Typography>
          )}
        </TableCell>

        {/* Reason */}
        <TableCell>
          {patient.reason ? (
            <Tooltip title={patient.reason}>
              <Typography
                variant="body2"
                sx={{
                  maxWidth: 150,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {patient.reason}
              </Typography>
            </Tooltip>
          ) : (
            <Typography variant="body2" color="text.secondary">
              -
            </Typography>
          )}
        </TableCell>
      </TableRow>

      {/* Expandable Progress Timeline Row */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Patient Journey Timeline
              </Typography>

              {/* Progress Steps */}
              <Box display="flex" flexDirection="column" gap={1}>
                {patient.progress && patient.progress.map((step, idx) => {
                  const statusCode = step.subjectState?.coding?.[0]?.code || 'unknown';
                  const statusText = step.subjectState?.text || statusCode;
                  const date = step.startDate;
                  const reason = step.reason?.text;

                  return (
                    <Box
                      key={idx}
                      display="flex"
                      alignItems="center"
                      gap={2}
                      sx={{
                        p: 1,
                        bgcolor: idx === patient.progress.length - 1 ? 'action.hover' : 'transparent',
                        borderRadius: 1,
                      }}
                    >
                      {/* Step Number */}
                      <Chip
                        label={idx + 1}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ minWidth: 32 }}
                      />

                      {/* Status */}
                      <Chip
                        label={statusText}
                        size="small"
                        color={getStatusColor(statusCode)}
                        sx={{ minWidth: 120 }}
                      />

                      {/* Date */}
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                        {date}
                      </Typography>

                      {/* Reason */}
                      {reason && (
                        <Typography variant="body2" color="text.secondary">
                          → {reason}
                        </Typography>
                      )}

                      {/* Current indicator */}
                      {idx === patient.progress.length - 1 && (
                        <Chip
                          label="CURRENT"
                          size="small"
                          color="primary"
                          sx={{ ml: 'auto' }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

/**
 * PatientDetailTable Component
 *
 * @param {Object} props - Component props
 * @param {Array} props.patients - Array of patient objects
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onRefresh - Refresh callback
 * @returns {JSX.Element} Patient detail table
 */
const PatientDetailTable = ({
  patients = [],
  loading = false,
  onRefresh,
}) => {
  // ===== STATE =====

  /**
   * Sorting state
   * orderBy: column name to sort by
   * order: 'asc' or 'desc'
   */
  const [orderBy, setOrderBy] = useState('screeningId');
  const [order, setOrder] = useState('asc');

  // ===== SORTING =====

  /**
   * Handle sort request
   *
   * Toggles sort order if clicking same column,
   * sets to 'asc' if clicking different column
   *
   * @param {string} property - Column property to sort by
   */
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  /**
   * Sort patients array
   *
   * @param {Array} array - Array to sort
   * @param {string} orderBy - Property to sort by
   * @param {string} order - Sort direction
   * @returns {Array} Sorted array
   */
  const sortedPatients = React.useMemo(() => {
    return [...patients].sort((a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];

      // Handle null/undefined
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Convert to string for comparison
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();

      if (order === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [patients, orderBy, order]);

  // ===== RENDER =====

  /**
   * Table columns configuration
   */
  const columns = [
    { id: 'expand', label: '', sortable: false, width: 50 },
    { id: 'screeningId', label: 'Screening ID', sortable: true },
    { id: 'name', label: 'Name', sortable: true },
    { id: 'condition', label: 'Condition', sortable: true },
    { id: 'statusText', label: 'Status', sortable: true },
    { id: 'startDate', label: 'Start Date', sortable: true },
    { id: 'lastUpdate', label: 'Last Update', sortable: true },
    { id: 'studyId', label: 'Study ID', sortable: true },
    { id: 'reason', label: 'Reason', sortable: false },
  ];

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Patient Detail
          {!loading && (
            <Typography component="span" variant="body2" color="text.secondary" ml={1}>
              ({patients.length} patients)
            </Typography>
          )}
        </Typography>

        {/* Refresh Button */}
        {onRefresh && (
          <IconButton onClick={onRefresh} size="small" disabled={loading}>
            <RefreshIcon />
          </IconButton>
        )}
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          {/* Table Head */}
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  sortDirection={orderBy === column.id ? order : false}
                  width={column.width}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleRequestSort(column.id)}
                    >
                      <strong>{column.label}</strong>
                    </TableSortLabel>
                  ) : (
                    <strong>{column.label}</strong>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          {/* Table Body */}
          <TableBody>
            {/* Loading State */}
            {loading && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" color="text.secondary" mt={2}>
                    Loading patient data...
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {/* Empty State */}
            {!loading && patients.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No patients found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Try adjusting your filters or select a different study/site/ward combination
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {/* Patient Rows */}
            {!loading && sortedPatients.map((patient) => (
              <PatientRow key={patient.id} patient={patient} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default PatientDetailTable;
