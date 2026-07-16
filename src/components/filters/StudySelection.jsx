/**
 * StudySelection Component
 *
 * Dropdown component for selecting the active study in the tracking dashboard.
 * This is the top of the Study -> Site -> Ward -> Group filter cascade:
 * - Fetches the studies list once on mount (getProcessedStudies)
 * - Persists the selected study code to localStorage so it survives reloads
 * - Dispatches the full study object via setStudy, which cascades-clears
 *   currentSite/currentWard/currentGroup/currentCondition in studySlice
 * - Backfills currentStudy.group with the full ResearchStudy resource's
 *   comparisonGroup once it loads (see COMPARISONGROUP BACKFILL below)
 *
 * This component only concerns itself with *which study* is selected - it does
 * not touch site/ward/group state directly. SiteSelection/WardSelection/GroupFilter
 * each react independently to the resulting currentStudy/currentSite/currentWard
 * Redux state, the same cascade model already used across the app.
 *
 * COMPARISONGROUP BACKFILL:
 * =========================
 * getProcessedStudies() reads a /ResearchStudy SEARCH bundle, which some FHIR
 * servers return in an abbreviated form that omits less-central fields like
 * comparisonGroup - so GroupFilter (which reads currentStudy.group) can end up
 * with nothing to show. getResearchStudy(studyId) fetches the FULL resource by
 * id, which reliably includes comparisonGroup (TrackingCurrent's loadStudyData
 * already relies on this for recruitment targets). So: dispatch the list-derived
 * study immediately for a responsive UI, then dispatch setStudy AGAIN with the
 * same studyCode once the full resource loads to patch in the authoritative
 * groups - studySlice's setStudy only cascade-clears Site/Ward/Group when the
 * studyCode actually changes, so this second dispatch is safe even if the user
 * already picked a Site/Ward against the initial, abbreviated object.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

import { setStudy } from '../../store/studySlice';
import { getProcessedStudies, getResearchStudy } from '../../services/fhirService';

const STORAGE_KEY = 'selectedStudyCode';

/**
 * StudySelection Component
 *
 * @param {Object} props - Component props
 * @param {Object} props.sx - Optional MUI sx prop for styling
 * @param {boolean} props.fullWidth - Whether the FormControl should be full width (default: true)
 * @param {Function} [props.onChange] - Optional callback(studyCode, studyObj) fired after selection
 * @returns {JSX.Element} Study selection dropdown
 */
const StudySelection = ({ sx = {}, fullWidth = true, onChange }) => {
  const dispatch = useDispatch();

  const [studies, setStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(() => localStorage.getItem(STORAGE_KEY) || '');

  // Tracks the most recently selected study code so a slow getResearchStudy
  // backfill (see COMPARISONGROUP BACKFILL above) can't clobber a newer
  // selection if the user switches studies again before it resolves.
  const latestStudyCodeRef = useRef(selectedStudy);

  useEffect(() => {
    const loadStudies = async () => {
      try {
        const studyList = await getProcessedStudies();
        setStudies(studyList);
      } catch (error) {
        console.error('[StudySelection] Error loading studies:', error);
      }
    };

    loadStudies();
  }, []);

  // Fetches the full ResearchStudy resource and patches the authoritative
  // comparisonGroup into currentStudy.group (see COMPARISONGROUP BACKFILL
  // above). Shared by handleChange (user picks a study) and the mount effect
  // below (study was restored from localStorage/redux-persist), since both
  // cases need the same freshness guarantee - a persisted currentStudy can be
  // arbitrarily old and never gets re-fetched otherwise.
  const backfillStudyGroups = (studyCode, studyObj) => {
    if (!studyObj) return;

    getResearchStudy(`Study${studyCode}`)
      .then((fullDetail) => {
        if (!fullDetail?.comparisonGroup || latestStudyCodeRef.current !== studyCode) return;
        // Same studyCode as the dispatch above, so setStudy's same-study check
        // leaves Site/Ward/Group alone - this only refines currentStudy.group.
        dispatch(setStudy({ ...studyObj, group: fullDetail.comparisonGroup }));
      })
      .catch((error) => {
        console.error(`[StudySelection] Error backfilling comparisonGroup for ${studyCode}:`, error);
      });
  };

  // Once the studies list has loaded, if a study was already selected
  // (restored from localStorage on mount, with currentStudy rehydrated by
  // redux-persist), refresh its comparisonGroup. Without this, a study
  // selected in a previous session keeps whatever group list happened to be
  // persisted back then and never picks up server-side changes.
  useEffect(() => {
    if (!selectedStudy || studies.length === 0) return;

    const studyObj = studies.find((s) => s.studyCode === selectedStudy) || null;
    if (studyObj) {
      backfillStudyGroups(selectedStudy, studyObj);
    }
    // Only run this once per studies-load, not on every selectedStudy change -
    // handleChange already covers user-initiated selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studies]);

  const handleChange = (event) => {
    const studyCode = event.target.value;
    setSelectedStudy(studyCode);
    localStorage.setItem(STORAGE_KEY, studyCode);
    latestStudyCodeRef.current = studyCode;

    const studyObj = studies.find((s) => s.studyCode === studyCode) || null;
    dispatch(setStudy(studyObj));

    onChange?.(studyCode, studyObj);

    backfillStudyGroups(studyCode, studyObj);
  };

  return (
    <FormControl fullWidth={fullWidth} sx={sx}>
      <InputLabel id="study-selection-label">Select Study</InputLabel>
      <Select
        labelId="study-selection-label"
        id="study-selection"
        value={selectedStudy}
        onChange={handleChange}
        label="Select Study"
      >
        <MenuItem value="">
          <em>All Studies</em>
        </MenuItem>
        {studies.map((study) => (
          <MenuItem key={study.id || study.studyCode} value={study.studyCode}>
            {study.studyCode}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default StudySelection;
