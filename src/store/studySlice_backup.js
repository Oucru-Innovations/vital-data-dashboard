import { createSlice } from '@reduxjs/toolkit';

const studySlice = createSlice({
  name: 'study',
  initialState: {
    // currentStudy: '56EI',
    // currentSite: '003', 
    currentStudy: null,
    currentSite: null,
    currentWard: null,
    currentCondition: null,
    currentGroup: null,
  },
  reducers: {
    setCurrentCondition: (state, action) => {
      state.currentCondition = action.payload;
    },
    clearCurrentCondition: (state) => {
      state.currentCondition = null;
    },
    setCurrentGroup: (state, action) => {
      state.currentGroup = action.payload;
    },
    clearCurrentGroup: (state) => {
      state.currentGroup = null;
    },
    setStudy: (state, action) => {
      state.currentStudy = action.payload;
      // Reset dependent selections
      state.currentSite = null;
      state.currentWard = null;
      state.currentCondition = null; // Clear on study change
      state.currentGroup = null; // Clear on study change
    },
    setSite: (state, action) => {
      state.currentSite = action.payload;
      // Clear ward when site changes
      // state.currentWard = null;
    },
    setCurrentWard: (state, action) => {
      state.currentWard = action.payload;
    },
    clearWard: (state) => {
      state.currentWard = null;
    }
  }
});

export const { setCurrentCondition, clearCurrentCondition, setCurrentGroup, clearCurrentGroup, setStudy, setSite, setCurrentWard, clearWard } = studySlice.actions;

// Selectors
export const selectCurrentStudy = (state) => state.study.currentStudy;
export const selectCurrentSite = (state) => state.study.currentSite;
export const selectCurrentWard = (state) => state.study.currentWard;

// Computed selector for alias
export const selectAlias = (state) => {
  const { currentStudy, currentSite, currentWard } = state.study;
  if (currentStudy && currentSite) {
    if (currentWard && currentWard!==null ) {
      return currentWard.alias[0];
      // return `${currentStudy.studyCode}-${currentSite.code}-${currentWard.code}`;
    }
    // Provide flexible for study with multiple site
    return `${currentStudy.studyCode}-${currentSite.code}`;
    
    return null;
  }
  return null;
};

export default studySlice.reducer;