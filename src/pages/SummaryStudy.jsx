import React, { useEffect, useState } from 'react';
import { getSummaryDataByStudy } from '../services/apiService';
import { renderSummaryCards } from '../components/cards/SummaryStudyPage/SummaryCards';
import SummaryTable from '../components/tables/SummaryStudyPage/SummaryTable';
import TransitionPlot from '../components/charts/SummaryStudyPage/TransitionPlot';
import { Box, Grid, Typography, CircularProgress, Divider, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Footer from '../components/toolbars/Footer';

const SummaryStudyPage = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const defaultParams = [
    { key: 'study', value: '01NVa_Dengue', enabled: false },
    { key: 'others', value: "s.name<>'01NVe'", equals: true, enabled: true }
  ];

  const constructParams = (params) => {
    return params
      .filter((param) => param.enabled)
      .reduce((query, param) => {
        query[param.key] = param.value;
        return query;
      }, {});
  };

  const cleanAndParseJSON = (rawString) => {
    try {
      let cleanedString = rawString
        .replace(/\r|\n/g, '')
        .replace(/}(\s*)"/g, '},$1"')
        .replace(/](\s*)"/g, '],$1"')
        .replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(cleanedString);
    } catch (error) {
      console.error('Error cleaning/parsing JSON:', error);
      return null;
    }
  };

  const fetchSummaryData = async (queryParams) => {
    try {
      const response = await getSummaryDataByStudy(queryParams);
      let data = typeof response === 'string' ? cleanAndParseJSON(response) : response;

      data = {
        study: data.study.filter((d) => d?.trim() || ""),
        patient: data.patient.filter((p) => p?.trim() || "0"),
        title: data.title.filter((t) => t?.trim() || ""),
        description: data.description.filter((d) => d?.trim() || ""),
        site: data.site.map((siteArray) =>
          siteArray.filter((s) => s?.trim() || "").join(', ')
        ),
        session: data.session.filter((s) => s?.trim() || "0"),
      };

      setSummaryData(
        data || { study: [], patient: [], title: [], description: [], site: [], session: [] }
      );
    } catch (error) {
      console.error('Error fetching summary data:', error);
      setSummaryData({ study: [], patient: [], title: [], description: [], site: [], session: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = constructParams(defaultParams);
    fetchSummaryData(query);
  }, []);

  return (
    <Box sx={{ padding: '16px' }}>
      <Typography variant="h4" align="center" sx={{ fontWeight: 'bold', marginBottom: '16px' }}>
        Summary by Study
      </Typography>
      <Divider sx={{ marginBottom: '24px' }} />
      {loading ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={12}>
            {renderSummaryCards(summaryData)}
          </Grid>
          <Grid item xs={12} md={6}>
            <TransitionPlot summaryData={summaryData} summaryDataValues={summaryData.patient} titleText="Patient Distribution" />
          </Grid>
          <Grid item xs={12} md={6}>
            <TransitionPlot summaryData={summaryData} summaryDataValues={summaryData.session} titleText="Patient Day Distribution" />
          </Grid>
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="summary-table-content"
                id="summary-table-header"
                sx={{
                  backgroundColor: '#e1f5fe',
                  borderBottom: '2px solid #0288d1',
                  fontWeight: 'bold',
                }}
              >
                <Typography>Summary Table</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <SummaryTable summaryData={summaryData} />
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      )}
      <Footer />
    </Box>
  );
};

export default SummaryStudyPage;
