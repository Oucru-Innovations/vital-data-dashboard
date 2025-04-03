import React, { useEffect, useState } from 'react';
import { getStudyLifetimeRecruitment, getStudyTimeline, getStudyTracking } from '../../services/apiService';
import { renderRecruitmentCards } from '../../components/cards/TrackingStudyPage/RecruitmentCards';
import { renderRecruitmentChart, renderStatusChart, renderTimelineChart } from '../../components/charts/TrackingStudyPage/TimelineChart';
// import { Box, Grid, Typography, CircularProgress, Divider, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { Box, Grid, Typography, CircularProgress, Divider, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Footer from '../../components/toolbars/Footer';
import { processTimelineData, transposeData } from './utils/recruitmentProcessing';

const TrackingStudyPage = () => {
  const [studyList, setStudyList] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(localStorage.getItem('study')||'all'); // Add this state
  const [recruitmentData, setRecruitmentData] = useState({
    totalRecruited: 0,
    monthlyChange: 0,
    activePatients: 0,
    completedPatients: 0,
    droppedPatients: 0,
    stages: []
  });
  const [loading, setLoading] = useState(true);

  const fetchStudyTrackingData = async () => {
    try {
      
      const response = await getStudyLifetimeRecruitment(selectedStudy);
      const monthlyData = transposeData(response.data);
      // console.log('Study Tracking Data:', monthlyData);
      setRecruitmentData({
        ...recruitmentData,
        stages: monthlyData || []
      });
    } catch (error) {
      console.error('Error fetching study tracking data:', error);
    } finally {
      setLoading(false);
    }
  };
const fetchStudyTimelineData = async () => {
  try {
    const response = await getStudyTimeline();
    const timelineTable = transposeData(response.data);
    const processedTimeline = processTimelineData(timelineTable);
    setStudyList(processedTimeline.map(study => study.name));
  }
  catch (error) {
    console.error('Error fetching timeline data:', error);
  }
};
  useEffect(() => {
    fetchStudyTimelineData();
  }, []);
  useEffect(() => {
    fetchStudyTrackingData(selectedStudy);
  }
  , [selectedStudy]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: '16px' }}>
      <Typography variant="h4" align="center" sx={{ fontWeight: 'bold', marginBottom: '16px' }}>
        Recruitment Tracking by Study
      </Typography>
      <Divider sx={{ marginBottom: '24px' }} />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="study-select-label">Select Study</InputLabel>
          <Select
            labelId="study-select-label"
            id="study-select"
            value={selectedStudy}
            label="Select Study"
            onChange={(e) => {
              setSelectedStudy(e.target.value); 
              localStorage.setItem('study', e.target.value);}}
          >
            <MenuItem value="all"></MenuItem>
            {studyList.map((study,idx) => (
              <MenuItem key={idx} value={study}>
                {study}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* <Grid item xs={12} md={12}>
          {renderRecruitmentCards(recruitmentData)}
        </Grid> */}

        <Grid item xs={12} md={12}>
          {renderRecruitmentChart(recruitmentData.stages || [])}
        </Grid>

        {/* 
        <Grid item xs={12} md={6}>
          {renderStatusChart(recruitmentData)}
        </Grid>
<Grid item xs={12}>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="timeline-chart-content"
              id="timeline-chart-header"
              sx={{
                backgroundColor: '#e1f5fe',
                borderBottom: '2px solid #0288d1',
                fontWeight: 'bold',
              }}
            >
              <Typography>Study Timeline Progress</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderTimelineChart(recruitmentData.studies || [])}
            </AccordionDetails>
          </Accordion>
        </Grid>*/}
      </Grid> 

      <Footer />
    </Box>
  );
};

export default TrackingStudyPage;
