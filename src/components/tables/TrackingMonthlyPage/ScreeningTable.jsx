import React, { useMemo } from "react";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { Box, Typography, Paper, Divider } from "@mui/material";

const ScreeningTable = ({ data, endDate }) => {
  const apiRef = useGridApiRef();

  // Transform data for the table
  const { rows, columns } = useMemo(() => {


//     [
//     {
//         "date": "2025-09-30",
//         "study": "55EI",
//         "screening_summary": {
//             "comparision_groups": [
//                 "Group A",
//                 "Total"
//             ],
//             "screened": [
//                 6,
//                 6
//             ],
//             "enrolled": [
//                 2,
//                 2
//             ],
//             "ineligible": [
//                 1,
//                 1
//             ],
//             "declined": [
//                 0,
//                 0
//             ],
//             "other_reasons": [
//                 0,
//                 0
//             ],
//             "withdrawn": [
//                 null,
//                 null
//             ],
//             "lost_followup": [
//                 null,
//                 null
//             ],
//             "discharged": [
//                 null,
//                 null
//             ],
//             "exclusion_reasons": {},
//             "cummulative_screened": [
//                 6,
//                 6
//             ]
//         }
//     }
// ]
    if (!data?.screening_summary) return { rows: [], columns: [] };
    
    const summary = data.screening_summary;
    const groups = summary.comparision_groups || [];
        // Define columns based on groups
    const dynamicColumns = [
      { field: 'metric', headerName: 'Metric', width: 180 },
      ...groups.map(group => ({
        field: group === 'Total' ? 'total' : `group_${group.replace(/\s+/g, '_')}`,
        headerName: group, // Use the group name directly without adding "Group" prefix
        width: 120,
        align: 'center',
      }))
    ];
    
    // Create rows from the data
    const tableRows = [
      {
        id: 'groups_header',
        metric: 'Groups',
        ...createGroupFields(groups, groups.map(group => group))
      },
      {
        id: 'screened',
        metric: 'Screened',
        ...createGroupFields(groups, summary.screened || [])
      },
      {
        id: 'enrolled',
        metric: 'Enrolled',
        ...createGroupFields(groups, summary.enrolled || [])
      },
      {
        id: 'ineligible',
        metric: 'Ineligible',
        ...createGroupFields(groups, summary.ineligible || [])
      },
      {
        id: 'declined',
        metric: 'Declined',
        ...createGroupFields(groups, summary.declined || [])
      },
      {
        id: 'other_reasons',
        metric: 'Other reasons',
        ...createGroupFields(groups, summary.other_reasons || [])
      },
      {
        id: 'withdrawn',
        metric: 'Withdrawn',
        ...createGroupFields(groups, summary.withdrawn || [])
      },
      {
        id: 'lost_followup',
        metric: 'Lost follow-up',
        ...createGroupFields(groups, summary.lost_followup || [])
      },
      {
        id: 'discharged',
        metric: 'Discharged',
        ...createGroupFields(groups, summary.discharged || [])
      }
    ];

    return { rows: tableRows, columns: dynamicColumns };
  }, [data]);

  // Helper function to map array values to group columns
  function createGroupFields(groups, values) {
    const fields = {};
    groups.forEach((group, index) => {
      const fieldName = group === 'Total' ? 'total' : `group_${group.replace(/\s+/g, '_')}`;
      fields[fieldName] = values[index] === null ? '-' : values[index];
    });
    return fields;
  }

  // If no data, show empty state
  if (!data || !rows.length) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" align="center">
          No screening data available
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Screening Summary - {data.study || 'All Studies'} 
          {endDate && ` (as of ${endDate})`}
        </Typography>
        
        <DataGrid
          apiRef={apiRef}
          rows={rows}
          columns={columns}
          autoHeight
          headerHeight={0}
          hideFooter
          disableColumnMenu
          disableColumnSelector
          disableSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid rgba(224, 224, 224, 1)',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'primary.light',
              color: 'primary.contrastText',
            }
          }}
        />

        {/* Exclusion reasons section */}
        {data?.screening_summary?.exclusion_reasons && 
          Object.keys(data.screening_summary.exclusion_reasons).length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Classification of other reasons:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                {Object.entries(data.screening_summary.exclusion_reasons).map(([reason, count]) => (
                  <Box component="li" key={reason}>
                    {reason}: {count}
                  </Box>
                ))}
              </Box>
            </>
          )
        }
      </Paper>
    </Box>
  );
};

export default ScreeningTable;