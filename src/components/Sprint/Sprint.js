import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  Star,
  Calendar,
  Flame,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Code2,
  Server,
  ChevronRight,
  Search,
  Download,
  Upload,
  Trash2,
  Sun,
  Moon,
  Clock,
  Sparkles,
  Filter,
  AlertCircle,
  Check,
  X,
  Terminal,
  SlidersHorizontal,
  Copy,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import {
  CURRICULUM_META,
  INITIAL_CURRICULUM,
  TIMER_MODES,
  DEFAULT_JOURNAL_ENTRY,
  calculateSprintDayDate
} from './curriculumData';
import {
  getActiveConfigKey,
  setActiveConfigKey,
  subscribeToSprintProgress,
  saveSprintProgress,
  pullSprintProgressOnce,
  loadLocalSprintState,
  saveSprintToLocalStorage
} from '../../services/sprintService';
import './sprint.css';

export default function Sprint({ onClose }) {
  // Room/Config Key for cross-laptop sync (Share module pattern)
  const [configKey, setConfigKey] = useState(getActiveConfigKey);
  const [keyInput, setKeyInput] = useState(configKey);
  const [cloudStatus, setCloudStatus] = useState('connecting'); // 'connected', 'connecting', 'local', 'syncing', 'error'
  const [lastSyncedTime, setLastSyncedTime] = useState(null);

  // Synchronous local state hydration (zero-latency on mount)
  const initialLocal = useMemo(() => loadLocalSprintState(configKey), [configKey]);

  // Dynamic Start Date & Timeline state
  const [startDate, setStartDate] = useState(initialLocal.startDate || CURRICULUM_META.defaultStartDate || '2026-11-17');

  // Dynamic curriculum with computed dates based on user's chosen start date
  const curriculum = useMemo(() => {
    return INITIAL_CURRICULUM.map((dayItem) => {
      const { date, weekday } = calculateSprintDayDate(startDate, dayItem.day);
      return {
        ...dayItem,
        date,
        weekday
      };
    });
  }, [startDate]);

  // Dynamic timeline metadata (Hero tagline & 40-day target deadline)
  const sprintTimeline = useMemo(() => {
    const startInfo = calculateSprintDayDate(startDate, 1);
    const endInfo = calculateSprintDayDate(startDate, INITIAL_CURRICULUM.length);
    const tagline = `${startInfo.date.toUpperCase()} → ${endInfo.date.toUpperCase()} • RIGOROUS EXECUTION WORKSPACE`;
    return {
      startInfo,
      endInfo,
      tagline,
      targetDate: endInfo.fullDate
    };
  }, [startDate]);

  // Theme state
  const [darkMode, setDarkMode] = useState(initialLocal.darkMode);

  // Persistent Progress State
  const [completedDsa, setCompletedDsa] = useState(initialLocal.completedDsa);
  const [flaggedDsa, setFlaggedDsa] = useState(initialLocal.flaggedDsa);
  const [completedSd, setCompletedSd] = useState(initialLocal.completedSd);
  const [completedDays, setCompletedDays] = useState(initialLocal.completedDays);
  const [journals, setJournals] = useState(initialLocal.journals);

  // UI & Filter State
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayNum, setSelectedDayNum] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const fileInputRef = useRef(null);

  // Stability & hydration refs
  const isTypingRef = useRef(false);
  const isLoadedRef = useRef(true);
  const saveTimeoutRef = useRef(null);
  const latestPayloadRef = useRef({
    completedDsa: initialLocal.completedDsa,
    flaggedDsa: initialLocal.flaggedDsa,
    completedSd: initialLocal.completedSd,
    completedDays: initialLocal.completedDays,
    journals: initialLocal.journals,
    darkMode: initialLocal.darkMode,
    startDate: initialLocal.startDate || '2026-11-17'
  });

  // Timer State
  const [timerModeIndex, setTimerModeIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TIMER_MODES[0].seconds);
  const [timerRunning, setTimerRunning] = useState(false);

  const triggerToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }, []);

  // Update Start Date handler
  const handleUpdateStartDate = (newDateStr) => {
    if (!newDateStr) return;
    setStartDate(newDateStr);
    triggerDebouncedSave({
      completedDsa,
      flaggedDsa,
      completedSd,
      completedDays,
      journals,
      darkMode,
      startDate: newDateStr
    });
    triggerToast(`Sprint start date set to ${newDateStr}`);
  };

  // 1. Subscribe to Firebase RTDB for active configKey
  useEffect(() => {
    let isSubscribed = true;

    const unsubscribe = subscribeToSprintProgress(configKey, {
      onData: (remoteData, meta) => {
        if (!isSubscribed) return;

        if (remoteData) {
          if (isTypingRef.current) return;
          if (remoteData.completedDsa) setCompletedDsa(remoteData.completedDsa);
          if (remoteData.flaggedDsa) setFlaggedDsa(remoteData.flaggedDsa);
          if (remoteData.completedSd) setCompletedSd(remoteData.completedSd);
          if (remoteData.completedDays) setCompletedDays(remoteData.completedDays);
          if (remoteData.journals) setJournals(remoteData.journals);
          if (typeof remoteData.darkMode === 'boolean') setDarkMode(remoteData.darkMode);
          if (remoteData.startDate) setStartDate(remoteData.startDate);
          if (remoteData.updatedAt) setLastSyncedTime(new Date(remoteData.updatedAt));

          // Cache remote snapshot locally
          saveSprintToLocalStorage(configKey, remoteData);
          latestPayloadRef.current = remoteData;
        } else if (meta?.isNew && latestPayloadRef.current) {
          // Newly initialized cloud room: push local progress to cloud
          saveSprintProgress(configKey, latestPayloadRef.current).catch(() => { });
        }

        isLoadedRef.current = true;
      },
      onStatusChange: (status) => {
        if (!isSubscribed) return;
        setCloudStatus(status);
      },
      onError: (err) => {
        console.warn('Sprint cloud sync warning:', err);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [configKey]);

  // 2. Immediate Local Storage Write + Debounced Cloud Sync
  const triggerDebouncedSave = useCallback((updatedState) => {
    const effectiveStartDate = updatedState.startDate || startDate;
    const payload = {
      completedDsa: updatedState.completedDsa || {},
      flaggedDsa: updatedState.flaggedDsa || {},
      completedSd: updatedState.completedSd || {},
      completedDays: updatedState.completedDays || {},
      journals: updatedState.journals || {},
      darkMode: typeof updatedState.darkMode === 'boolean' ? updatedState.darkMode : true,
      startDate: effectiveStartDate,
      lastUpdated: new Date().toISOString()
    };

    latestPayloadRef.current = payload;

    // A. Synchronous, instantaneous save to localStorage (impervious to immediate component close)
    saveSprintToLocalStorage(configKey, payload);

    // B. Debounce network write to Firebase RTDB (450ms)
    setCloudStatus('syncing');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await saveSprintProgress(configKey, payload);
        if (res.cloud) {
          setCloudStatus('connected');
          setLastSyncedTime(new Date());
        } else {
          setCloudStatus('local');
        }
      } catch (err) {
        console.error('Failed to save sprint progress:', err);
        setCloudStatus('error');
      }
    }, 450);
  }, [configKey, startDate]);

  // Clean unmount flush
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (latestPayloadRef.current) {
        saveSprintToLocalStorage(configKey, latestPayloadRef.current);
      }
    };
  }, [configKey]);

  // Safe Close Handler: Synchronously flushes state before triggering onClose
  const handleClose = useCallback(() => {
    if (latestPayloadRef.current) {
      saveSprintToLocalStorage(configKey, latestPayloadRef.current);
      saveSprintProgress(configKey, latestPayloadRef.current).catch(() => { });
    }
    if (onClose) onClose();
  }, [configKey, onClose]);

  // Timer Interval
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          triggerToast(`Timer complete: ${TIMER_MODES[timerModeIndex].label}!`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerModeIndex, triggerToast]);

  // Escape key handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showSettingsModal) {
          setShowSettingsModal(false);
        } else if (selectedDayNum !== null) {
          setSelectedDayNum(null);
        } else if (onClose) {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDayNum, showSettingsModal, onClose, handleClose]);

  const handleSelectTimerMode = (index) => {
    setTimerRunning(false);
    setTimerModeIndex(index);
    setSecondsLeft(TIMER_MODES[index].seconds);
  };

  const formatTime = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Toggle DSA Item
  const toggleDsaItem = (dayObj, dsaId) => {
    const nextCompletedDsa = { ...completedDsa, [dsaId]: !completedDsa[dsaId] };
    const allDsaDone = dayObj.dsa.every((item) => nextCompletedDsa[item.id]);
    const sdDone = !!completedSd[dayObj.systemDesign.id];
    const nextCompletedDays = { ...completedDays, [dayObj.day]: allDsaDone && sdDone };

    setCompletedDsa(nextCompletedDsa);
    setCompletedDays(nextCompletedDays);

    triggerDebouncedSave({
      completedDsa: nextCompletedDsa,
      flaggedDsa,
      completedSd,
      completedDays: nextCompletedDays,
      journals,
      darkMode
    });
  };

  // Toggle Sunday Flag
  const toggleFlagDsa = (e, dsaId) => {
    e.stopPropagation();
    const nextVal = !flaggedDsa[dsaId];
    const nextFlaggedDsa = { ...flaggedDsa, [dsaId]: nextVal };
    if (nextVal) {
      triggerToast('Flagged for Sunday Spaced Repetition');
    }
    setFlaggedDsa(nextFlaggedDsa);

    triggerDebouncedSave({
      completedDsa,
      flaggedDsa: nextFlaggedDsa,
      completedSd,
      completedDays,
      journals,
      darkMode
    });
  };

  // Toggle System Design Item
  const toggleSdItem = (dayObj) => {
    const sdId = dayObj.systemDesign.id;
    const nextCompletedSd = { ...completedSd, [sdId]: !completedSd[sdId] };
    const allDsaDone = dayObj.dsa.every((item) => completedDsa[item.id]);
    const nextCompletedDays = { ...completedDays, [dayObj.day]: allDsaDone && nextCompletedSd[sdId] };

    setCompletedSd(nextCompletedSd);
    setCompletedDays(nextCompletedDays);

    triggerDebouncedSave({
      completedDsa,
      flaggedDsa,
      completedSd: nextCompletedSd,
      completedDays: nextCompletedDays,
      journals,
      darkMode
    });
  };

  // Toggle Entire Day
  const toggleDayCompletion = (e, dayObj) => {
    e.stopPropagation();
    const nextState = !completedDays[dayObj.day];
    const nextCompletedDays = { ...completedDays, [dayObj.day]: nextState };

    const nextCompletedDsa = { ...completedDsa };
    dayObj.dsa.forEach((item) => {
      nextCompletedDsa[item.id] = nextState;
    });

    const nextCompletedSd = {
      ...completedSd,
      [dayObj.systemDesign.id]: nextState
    };

    setCompletedDays(nextCompletedDays);
    setCompletedDsa(nextCompletedDsa);
    setCompletedSd(nextCompletedSd);

    triggerDebouncedSave({
      completedDsa: nextCompletedDsa,
      flaggedDsa,
      completedSd: nextCompletedSd,
      completedDays: nextCompletedDays,
      journals,
      darkMode
    });
  };

  // Update Journal
  const updateJournal = (dayNum, field, value) => {
    const nextJournals = {
      ...journals,
      [dayNum]: {
        ...(journals[dayNum] || DEFAULT_JOURNAL_ENTRY),
        [field]: value
      }
    };
    setJournals(nextJournals);

    triggerDebouncedSave({
      completedDsa,
      flaggedDsa,
      completedSd,
      completedDays,
      journals: nextJournals,
      darkMode
    });
  };

  // Config Key Management
  const handleConnectKey = () => {
    const clean = setActiveConfigKey(keyInput);
    if (clean) {
      setConfigKey(clean);
      setKeyInput(clean);
      triggerToast(`Connected to room: ${clean}`);
    }
  };

  const handleCopyLink = () => {
    const origin = window.location.origin;
    const url = `${origin}/?sprintKey=${encodeURIComponent(configKey)}`;
    navigator.clipboard.writeText(url).then(() => {
      triggerToast(`Study link copied! Open on your office laptop: ?sprintKey=${configKey}`);
    }).catch(() => {
      triggerToast(`Room Key: ${configKey}`);
    });
  };

  const handleForcePull = async () => {
    try {
      const data = await pullSprintProgressOnce(configKey);
      if (data) {
        if (data.completedDsa) setCompletedDsa(data.completedDsa);
        if (data.flaggedDsa) setFlaggedDsa(data.flaggedDsa);
        if (data.completedSd) setCompletedSd(data.completedSd);
        if (data.completedDays) setCompletedDays(data.completedDays);
        if (data.journals) setJournals(data.journals);
        if (data.startDate) setStartDate(data.startDate);
        triggerToast('Latest progress pulled from cloud!');
      } else {
        triggerToast('No cloud data found for this key yet.');
      }
    } catch (err) {
      triggerToast('Error pulling from cloud');
    }
  };

  // JSON Export / Import
  const handleExportBackup = () => {
    const dataStr = JSON.stringify(
      {
        configKey,
        startDate,
        completedDsa,
        flaggedDsa,
        completedSd,
        completedDays,
        journals,
        darkMode,
        exportedAt: new Date().toISOString()
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sprint-backup-${configKey}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast('Backup JSON exported successfully');
  };

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.completedDsa) setCompletedDsa(parsed.completedDsa);
        if (parsed.flaggedDsa) setFlaggedDsa(parsed.flaggedDsa);
        if (parsed.completedSd) setCompletedSd(parsed.completedSd);
        if (parsed.completedDays) setCompletedDays(parsed.completedDays);
        if (parsed.journals) setJournals(parsed.journals);
        if (parsed.startDate) setStartDate(parsed.startDate);
        if (parsed.configKey) {
          const key = setActiveConfigKey(parsed.configKey);
          setConfigKey(key);
          setKeyInput(key);
        }

        triggerDebouncedSave({
          completedDsa: parsed.completedDsa || {},
          flaggedDsa: parsed.flaggedDsa || {},
          completedSd: parsed.completedSd || {},
          completedDays: parsed.completedDays || {},
          journals: parsed.journals || {},
          darkMode: typeof parsed.darkMode === 'boolean' ? parsed.darkMode : darkMode,
          startDate: parsed.startDate || startDate
        });

        triggerToast('Progress restored from backup!');
        setShowSettingsModal(false);
      } catch (err) {
        triggerToast('Invalid JSON backup file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset
  const [confirmReset, setConfirmReset] = useState(false);
  const executeResetProgress = () => {
    setCompletedDsa({});
    setFlaggedDsa({});
    setCompletedSd({});
    setCompletedDays({});
    setJournals({});

    triggerDebouncedSave({
      completedDsa: {},
      flaggedDsa: {},
      completedSd: {},
      completedDays: {},
      journals: {},
      darkMode
    });

    setConfirmReset(false);
    setShowSettingsModal(false);
    triggerToast('All progress has been reset');
  };

  // Executive KPI Stats
  const stats = useMemo(() => {
    const uniqueDsaIds = new Set();
    const solvedDsaIds = new Set();
    let flaggedCount = 0;

    (curriculum || []).forEach((day) => {
      (day.dsa || []).forEach((prob) => {
        if (!prob.title.startsWith('Mock Round')) {
          uniqueDsaIds.add(prob.leetcode || prob.id);
          if (completedDsa && completedDsa[prob.id]) {
            solvedDsaIds.add(prob.leetcode || prob.id);
          }
        }
        if (flaggedDsa && flaggedDsa[prob.id]) {
          flaggedCount++;
        }
      });
    });

    const totalDays = (curriculum && curriculum.length) || 40;
    const daysDoneCount = Object.values(completedDays || {}).filter(Boolean).length;
    const sdDoneCount = Object.values(completedSd || {}).filter(Boolean).length;

    let currentStreak = 0;
    let tempStreak = 0;
    for (let i = 1; i <= totalDays; i++) {
      if (completedDays && completedDays[i]) {
        tempStreak++;
        if (tempStreak > currentStreak) currentStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    const target = sprintTimeline?.targetDate || new Date();
    const now = new Date();
    const diffDays = Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));

    const overallPercent = Math.round(
      ((daysDoneCount / Math.max(1, totalDays)) * 0.4 +
        (solvedDsaIds.size / Math.max(1, uniqueDsaIds.size)) * 0.35 +
        (sdDoneCount / Math.max(1, totalDays)) * 0.25) *
      100
    );

    return {
      totalDays,
      daysDoneCount,
      solvedDsaCount: solvedDsaIds.size,
      totalDsaCount: uniqueDsaIds.size,
      sdDoneCount,
      flaggedCount,
      currentStreak,
      daysRemaining: diffDays,
      overallPercent: isNaN(overallPercent) ? 0 : overallPercent
    };
  }, [curriculum, completedDsa, flaggedDsa, completedSd, completedDays, sprintTimeline]);

  // Dynamic phase derivation
  const phases = useMemo(() => {
    const phaseMap = new Map();
    (curriculum || INITIAL_CURRICULUM).forEach((d) => {
      if (!phaseMap.has(d.phase)) {
        phaseMap.set(d.phase, { phase: d.phase, title: d.phaseTitle, minDay: d.day, maxDay: d.day });
      } else {
        const p = phaseMap.get(d.phase);
        p.maxDay = Math.max(p.maxDay, d.day);
      }
    });
    return Array.from(phaseMap.values());
  }, [curriculum]);

  // Filtered list
  const filteredCurriculum = useMemo(() => {
    return curriculum.filter((day) => {
      if (activeFilter.startsWith('phase-')) {
        const pNum = parseInt(activeFilter.replace('phase-', ''), 10);
        if (day.phase !== pNum) return false;
      }
      if (activeFilter === 'review') {
        const hasFlagged = day.dsa.some((item) => flaggedDsa[item.id]);
        if (!hasFlagged) return false;
      }
      if (activeFilter === 'incomplete' && completedDays[day.day]) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesDay = `day ${day.day}`.includes(q) || day.date.toLowerCase().includes(q);
        const matchesPattern = day.pattern.toLowerCase().includes(q);
        const matchesDsa = day.dsa.some((p) => p.title.toLowerCase().includes(q));
        const matchesSd =
          day.systemDesign.title.toLowerCase().includes(q) ||
          day.systemDesign.focus.toLowerCase().includes(q);
        return matchesDay || matchesPattern || matchesDsa || matchesSd;
      }

      return true;
    });
  }, [curriculum, activeFilter, searchQuery, flaggedDsa, completedDays]);

  const selectedDayObj = useMemo(
    () => curriculum.find((d) => d.day === selectedDayNum) || null,
    [curriculum, selectedDayNum]
  );

  const getDifficultyBadge = (diff) => {
    if (diff === 'Easy') return 'sp-badge-easy';
    if (diff === 'Medium') return 'sp-badge-medium';
    return 'sp-badge-hard';
  };

  const getPhaseBadge = (phase) => {
    if (phase === 1) return 'sp-phase-1';
    if (phase === 2) return 'sp-phase-2';
    if (phase === 3) return 'sp-phase-3';
    return 'sp-phase-4';
  };

  const themeClass = darkMode ? 'sprint-theme-dark' : 'sprint-theme-light';

  return (
    <div className={`sprint-workspace ${themeClass} sp-bg sp-text min-h-screen selection:bg-indigo-500/30`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium shadow-xl shadow-indigo-950/40 animate-fade-in">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Sticky Notion-Style Workspace Bar */}
      <header className="sp-top-header sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Brand Identity: Back button (if onClose) + 40 Blue Badge + Alphabet Sprint OS + Track Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            {onClose && (
              <button
                onClick={handleClose}
                className="sp-btn-back"
                title="Back to JSON Playground"
              >
                <ArrowLeft size={13} className="shrink-0" />
                <span>Back</span>
              </button>
            )}
            <div className="sp-badge-40">
              {CURRICULUM_META.badge}
            </div>
            <span className="font-semibold text-sm sm:text-base tracking-tight truncate">
              {CURRICULUM_META.brandName || 'Alphabet Sprint OS'}
            </span>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border sp-border sp-text-muted">
              {CURRICULUM_META.track}
            </span>
          </div>

          {/* Right Controls: Live Timer + Theme + Backup + Close */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Live Timer Pill */}
            <div className="sp-top-timer">
              <Clock size={15} className="sp-timer-clock shrink-0" style={{ color: TIMER_MODES[timerModeIndex].iconColor }} />
              <span className="sp-timer-text tabular-nums">
                {formatTime(secondsLeft)}
              </span>
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className="sprint-icon-btn"
                style={{ color: TIMER_MODES[timerModeIndex].iconColor }}
                title={timerRunning ? 'Pause Timer' : 'Start Timer'}
              >
                {timerRunning ? (
                  <Pause size={14} fill="currentColor" className="sp-timer-action" />
                ) : (
                  <Play size={14} fill="currentColor" className="sp-timer-action" />
                )}
              </button>
              <button
                onClick={() => {
                  setTimerRunning(false);
                  setSecondsLeft(TIMER_MODES[timerModeIndex].seconds);
                }}
                className="sprint-icon-btn sp-text-muted hover:text-indigo-400"
                title="Reset Timer"
              >
                <RotateCcw size={13} className="sp-timer-reset" />
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => {
                const nextDark = !darkMode;
                setDarkMode(nextDark);
                triggerDebouncedSave({
                  completedDsa,
                  flaggedDsa,
                  completedSd,
                  completedDays,
                  journals,
                  darkMode: nextDark
                });
              }}
              className="sp-top-theme-btn"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-700" />}
            </button>

            {/* Backup & Settings Trigger */}
            <button
              onClick={() => {
                setConfirmReset(false);
                setShowSettingsModal(true);
              }}
              className="sp-btn-backup"
              title="Backup & Workspace Settings"
            >
              <SlidersHorizontal size={14} className="text-neutral-400 shrink-0" />
              <span className="hidden sm:inline">Backup / Reset</span>
            </button>

            {/* Close Cross Button */}
            {onClose && (
              <button
                onClick={handleClose}
                className="sp-top-close-btn"
                title="Close Sprint Workspace"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Notion Page Cover / Hero Header */}
        <section className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-indigo-400">
                <Terminal size={13} className="sp-icon-xs" />
                <span>{sprintTimeline.tagline}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {CURRICULUM_META.title}
              </h1>
              <p className="text-sm sp-text-muted max-w-2xl">
                {CURRICULUM_META.description}
              </p>
            </div>

            {/* Overall Sprint Readiness Progress Bar */}
            <div className="sp-progress-card p-4 w-full lg:w-80 shrink-0">
              <div className="flex items-center justify-between text-xs font-medium mb-2">
                <span className="sp-text-muted">Overall Sprint Readiness</span>
                <span className="font-bold text-indigo-400">{stats.overallPercent}%</span>
              </div>
              <div className={`w-full h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-[#262932]' : 'bg-slate-200'}`}>
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${stats.overallPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] sp-text-subtle mt-2">
                <span>{stats.daysDoneCount}/{stats.totalDays} Days</span>
                <span>{stats.solvedDsaCount}/{stats.totalDsaCount} Blind 75</span>
                <span>{stats.sdDoneCount}/{stats.totalDays} Designs</span>
              </div>
            </div>
          </div>

          {/* Executive KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* KPI 1: Days Completed */}
            <div className="sp-kpi-card p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium sp-text-muted">Days Completed</span>
                <CheckCircle2 size={16} className="sp-icon-md text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold tabular-nums">
                {stats.daysDoneCount} <span className="text-xs font-normal sp-text-subtle">/ {stats.totalDays}</span>
              </div>
            </div>

            {/* KPI 2: Blind 75 Solved */}
            <div className="sp-kpi-card p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium sp-text-muted">Blind 75 Solved</span>
                <Code2 size={16} className="sp-icon-md text-indigo-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold tabular-nums">
                {stats.solvedDsaCount}{' '}
                <span className="text-xs font-normal sp-text-subtle">/ {stats.totalDsaCount}</span>
              </div>
            </div>

            {/* KPI 3: System Design Topics */}
            <div className="sp-kpi-card p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium sp-text-muted">System Designs</span>
                <Server size={16} className="sp-icon-md text-sky-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold tabular-nums">
                {stats.sdDoneCount} <span className="text-xs font-normal sp-text-subtle">/ {stats.totalDays}</span>
              </div>
            </div>

            {/* KPI 4: Streak & Flagged */}
            <div className="sp-kpi-card p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium sp-text-muted">Max Streak</span>
                <Flame size={16} className="sp-icon-md text-orange-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <div className="text-xl sm:text-2xl font-bold tabular-nums">
                  {stats.currentStreak} <span className="text-xs font-normal sp-text-subtle">days</span>
                </div>
                {stats.flaggedCount > 0 && (
                  <span className="text-[11px] font-medium text-amber-400 flex items-center gap-1">
                    <Star size={12} className="sp-icon-xs fill-amber-400" /> {stats.flaggedCount}
                  </span>
                )}
              </div>
            </div>

            {/* KPI 5: Target Countdown */}
            <div
              onClick={() => {
                setConfirmReset(false);
                setShowSettingsModal(true);
              }}
              className="col-span-2 sm:col-span-1 sp-kpi-card p-3.5 cursor-pointer hover:border-indigo-500/50 transition-colors"
              title="Click to adjust your sprint start date in Settings"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium sp-text-muted">Target Deadline</span>
                <Calendar size={16} className="sp-icon-md text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold tabular-nums">
                {stats.daysRemaining} <span className="text-xs font-normal sp-text-subtle">days left</span>
              </div>
              <div className="text-[10px] sp-text-subtle mt-1 truncate">
                {sprintTimeline.endInfo.date} ({sprintTimeline.endInfo.weekday})
              </div>
            </div>
          </div>

          {/* 3-Hour Daily Protocol Timer Bar */}
          <div className="sp-protocol-bar p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${TIMER_MODES[timerModeIndex].boxClass}`}>
                <Clock size={16} className="sp-icon-md" style={{ color: TIMER_MODES[timerModeIndex].iconColor }} />
              </div>
              <div>
                <div className="text-xs font-semibold flex items-center gap-2">
                  <span>Daily 3-Hour Execution Protocol Timer</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TIMER_MODES[timerModeIndex].badgeClass}`}>
                    {TIMER_MODES[timerModeIndex].label}
                  </span>
                </div>
                <p className="text-xs sp-text-muted mt-0.5">
                  Rule: Struggle max 20m on paper → Study pattern if stuck → Code clean from scratch.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {TIMER_MODES.map((mode, idx) => (
                <button
                  key={mode.id}
                  onClick={() => handleSelectTimerMode(idx)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${timerModeIndex === idx
                    ? mode.modeClass
                    : 'sp-mode-inactive'
                    }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Filter & Search Toolbar */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Phase & Review Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            <button
              onClick={() => setActiveFilter('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${activeFilter === 'all'
                ? 'sp-tab-active'
                : 'sp-tab-inactive'
                }`}
            >
              <span>All {stats.totalDays} Days</span>
            </button>

            {phases.map((p) => {
              const filterId = `phase-${p.phase}`;
              const isActive = activeFilter === filterId;
              return (
                <button
                  key={p.phase}
                  onClick={() => setActiveFilter(filterId)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${isActive
                    ? 'sp-tab-active'
                    : 'sp-tab-inactive'
                    }`}
                >
                  <span>Phase {p.phase} ({p.minDay}–{p.maxDay})</span>
                </button>
              );
            })}

            <button
              onClick={() => setActiveFilter('review')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${activeFilter === 'review'
                ? 'sp-tab-active'
                : 'sp-tab-inactive'
                }`}
            >
              <Star size={13} className={`sp-icon-xs ${activeFilter === 'review' ? 'text-amber-200 fill-amber-200' : 'text-amber-400'}`} />
              <span>Sunday Review ({stats.flaggedCount})</span>
            </button>

            <button
              onClick={() => setActiveFilter('incomplete')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${activeFilter === 'incomplete'
                ? 'sp-tab-active'
                : 'sp-tab-inactive'
                }`}
            >
              <span>Remaining</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search size={14} className="sp-icon-sm absolute left-3 top-1/2 -translate-y-1/2 sp-text-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search problem, pattern, Kafka, Redis..."
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border sp-border sp-input-bg sp-text focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="sprint-icon-btn absolute right-2.5 top-1/2 -translate-y-1/2 sp-text-subtle hover:text-indigo-400"
              >
                <X size={13} className="sp-icon-xs" />
              </button>
            )}
          </div>
        </section>

        {/* 40-Day Curriculum Cards List */}
        <section className="space-y-3">
          {filteredCurriculum.length === 0 ? (
            <div className="p-12 rounded-xl border sp-border sp-surface text-center space-y-2">
              <Filter className="w-8 h-8 mx-auto sp-text-subtle" />
              <h3 className="text-sm font-semibold">No matching sprint days found</h3>
              <p className="text-xs sp-text-muted">
                Try clearing your search filter or switching back to &quot;All {stats.totalDays} Days&quot;.
              </p>
              <button
                onClick={() => {
                  setActiveFilter('all');
                  setSearchQuery('');
                }}
                className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredCurriculum.map((dayObj) => {
              const isDayDone = !!completedDays[dayObj.day];
              const isSunday = dayObj.weekday === 'Sun';
              const journal = journals[dayObj.day];
              const hasNotes =
                journal &&
                (journal.patternNotes.trim() ||
                  journal.edgeCases.trim() ||
                  journal.systemDesignNotes.trim() ||
                  journal.confidence > 0);

              return (
                <div
                  key={dayObj.day}
                  onClick={() => setSelectedDayNum(dayObj.day)}
                  className={`group sp-day-card transition-all cursor-pointer ${isDayDone
                    ? darkMode
                      ? 'bg-[#161A18] border-emerald-500/30'
                      : 'bg-emerald-50/40 border-emerald-200'
                    : 'sp-surface sp-border hover:border-indigo-500/50'
                    }`}
                >
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-stretch">
                    {/* Left Column: Day Checkbox, Date & Phase Badge (Vertical Middle of Column) */}
                    <div className="sp-col-day">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => toggleDayCompletion(e, dayObj)}
                          className={`sprint-icon-btn transition-transform active:scale-90 ${isDayDone ? 'text-emerald-400' : 'sp-text-subtle hover:text-indigo-400'
                            }`}
                          title={isDayDone ? 'Mark Day Incomplete' : 'Mark Entire Day Complete'}
                        >
                          {isDayDone ? (
                            <CheckCircle2 size={18} className="sp-icon-md fill-emerald-500/20 text-emerald-400" />
                          ) : (
                            <Circle size={18} className="sp-icon-md text-neutral-500" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className="sp-day-title-row">
                            <span className={`sp-day-number ${isDayDone ? 'line-through opacity-70' : ''}`}>
                              Day&nbsp;{dayObj.day}
                            </span>
                            <span className="sp-day-date">
                              &bull;&nbsp;{dayObj.date} ({dayObj.weekday})
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getPhaseBadge(dayObj.phase)} whitespace-nowrap`}>
                              P{dayObj.phase}: {dayObj.phaseTitle}
                            </span>
                            {isSunday && (
                              <span className="sp-spaced-rep">
                                Spaced Rep
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mobile Journal Trigger Indicator */}
                      <div className="flex lg:hidden items-center gap-1.5 mt-2">
                        {hasNotes && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400" title="Has Journal Notes" />
                        )}
                        <ChevronRight size={14} className="sp-icon-sm sp-text-subtle" />
                      </div>
                    </div>

                    {/* Middle Column: DSA Problems Checklist (Vertical Middle of Column) */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="sp-col-dsa flex-1 space-y-2 pt-3 lg:pt-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider sp-text-subtle flex items-center gap-1.5">
                          <Code2 size={13} className="sp-icon-xs text-indigo-400" />
                          DSA PATTERN: <span className="text-white font-bold">{dayObj.pattern}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {dayObj.dsa.map((prob) => {
                          const isChecked = !!completedDsa[prob.id];
                          const isFlagged = !!flaggedDsa[prob.id];
                          return (
                            <div
                              key={prob.id}
                              onClick={() => toggleDsaItem(dayObj, prob.id)}
                              className={`sp-item-card flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs transition-colors cursor-pointer ${isChecked
                                ? darkMode
                                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : 'sp-input-bg sp-border sp-surface'
                                }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => { }}
                                  className="cursor-pointer shrink-0"
                                />
                                <span className={`truncate font-medium ${isChecked ? 'line-through opacity-75' : ''}`}>
                                  {prob.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${getDifficultyBadge(prob.difficulty)}`}>
                                  {prob.difficulty}
                                </span>
                                <button
                                  onClick={(e) => toggleFlagDsa(e, prob.id)}
                                  className={`sprint-icon-btn ${isFlagged ? 'text-amber-400' : 'sp-text-subtle hover:text-amber-400'
                                    }`}
                                  title={isFlagged ? 'Remove from Sunday Review' : 'Flag for Sunday Spaced Repetition'}
                                >
                                  <Star size={13} className={`sp-icon-xs ${isFlagged ? 'fill-amber-400' : ''}`} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Column: System Design Task + Journal Button (Vertical Middle of Column) */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="sp-col-sd lg:w-[320px] shrink-0 space-y-2 pt-3 lg:pt-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-200 flex items-center gap-1.5">
                          <Server size={13} className="sp-icon-xs text-sky-400" />
                          {dayObj.systemDesign.category}
                        </span>

                        <button
                          onClick={() => setSelectedDayNum(dayObj.day)}
                          className={`sp-btn-journal ${hasNotes ? 'has-notes' : ''}`}
                        >
                          <BookOpen size={9} className="sp-icon-xs shrink-0" />
                          <span>{hasNotes ? 'Journal Saved' : 'Open Journal'}</span>
                        </button>
                      </div>

                      <div
                        onClick={() => toggleSdItem(dayObj)}
                        className={`sp-item-card p-3 text-xs transition-colors cursor-pointer ${completedSd[dayObj.systemDesign.id]
                          ? darkMode
                            ? 'bg-sky-500/10 border-sky-500/30 text-sky-200'
                            : 'bg-sky-50 border-sky-200 text-sky-900'
                          : 'sp-input-bg sp-border sp-surface'
                          }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={!!completedSd[dayObj.systemDesign.id]}
                            onChange={() => { }}
                            className="sd-checkbox mt-0.5 cursor-pointer shrink-0"
                          />
                          <div className="space-y-0.5 min-w-0">
                            <div className={`font-medium leading-snug ${completedSd[dayObj.systemDesign.id] ? 'line-through opacity-75' : ''}`}>
                              {dayObj.systemDesign.title}
                            </div>
                            <p className="text-[11px] sp-text-muted line-clamp-1">
                              {dayObj.systemDesign.focus}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>

      {/* Notion-Style Daily Journal Drawer */}
      {selectedDayObj && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedDayNum(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="sp-journal-drawer"
          >
            {/* Drawer Header */}
            <div className="sp-journal-header">
              <div className="flex items-center gap-3 min-w-0">
                <span className="sp-journal-day-pill">
                  Day {selectedDayObj.day} of {stats.totalDays}
                </span>
                <div className="min-w-0">
                  <h2 className="sp-journal-title truncate">{selectedDayObj.pattern}</h2>
                  <p className="sp-journal-subtitle truncate">
                    {selectedDayObj.date} ({selectedDayObj.weekday}) • Engineering Scratchpad
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  disabled={selectedDayObj.day === 1}
                  onClick={() => setSelectedDayNum(Math.max(1, selectedDayObj.day - 1))}
                  className="sp-journal-nav-btn"
                  title="Previous Day"
                >
                  <ArrowLeft size={13} />
                  <span>Prev</span>
                </button>
                <button
                  disabled={selectedDayObj.day === stats.totalDays}
                  onClick={() => setSelectedDayNum(Math.min(stats.totalDays, selectedDayObj.day + 1))}
                  className="sp-journal-nav-btn"
                  title="Next Day"
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
                <button
                  onClick={() => setSelectedDayNum(null)}
                  className="sp-journal-close-btn"
                  title="Close Journal (Esc)"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Target Checklist */}
              <div className="sp-journal-targets-card">
                <div className="sp-journal-targets-title">
                  Today&apos;s Execution Targets
                </div>
                <div className="space-y-2">
                  {selectedDayObj.dsa.map((prob) => (
                    <div key={prob.id} className="sp-journal-target-item text-xs">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!completedDsa[prob.id]}
                          onChange={() => toggleDsaItem(selectedDayObj, prob.id)}
                          className="sp-journal-checkbox cursor-pointer shrink-0"
                        />
                        <span className={completedDsa[prob.id] ? 'line-through opacity-60' : 'font-medium text-sm'}>
                          {prob.title} {prob.leetcode ? `(LC #${prob.leetcode})` : ''}
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getDifficultyBadge(prob.difficulty)}`}>
                          {prob.difficulty}
                        </span>
                        <button
                          onClick={(e) => toggleFlagDsa(e, prob.id)}
                          className={`sp-journal-flag-btn ${flaggedDsa[prob.id] ? 'flagged' : ''}`}
                        >
                          <Star size={12} className={flaggedDsa[prob.id] ? 'fill-amber-400 text-amber-500' : ''} />
                          <span>Flag</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="sp-journal-target-item pt-1 text-xs">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!completedSd[selectedDayObj.systemDesign.id]}
                        onChange={() => toggleSdItem(selectedDayObj)}
                        className="sp-journal-checkbox sd-check mt-0.5 cursor-pointer shrink-0"
                      />
                      <div>
                        <div className={completedSd[selectedDayObj.systemDesign.id] ? 'line-through opacity-60' : 'font-medium text-sm'}>
                          {selectedDayObj.systemDesign.title}
                        </div>
                        <div className="text-xs sp-text-muted mt-0.5">
                          Focus: {selectedDayObj.systemDesign.focus}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Confidence Rating */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                  <span style={{ color: 'var(--sp-text)' }}>Self-Assessment &amp; Recall Confidence</span>
                  <span className="text-indigo-400 font-bold">
                    {(journals[selectedDayObj.day]?.confidence || 0) > 0
                      ? `${journals[selectedDayObj.day].confidence} / 5`
                      : 'UNRATED'}
                  </span>
                </label>
                <div className="sp-journal-score-grid">
                  {[
                    { score: 1, label: '1 • Stuck' },
                    { score: 2, label: '2 • Editorial' },
                    { score: 3, label: '3 • Slow' },
                    { score: 4, label: '4 • Optimal' },
                    { score: 5, label: '5 • Mastery' }
                  ].map((item) => {
                    const currentScore = journals[selectedDayObj.day]?.confidence || 0;
                    const active = currentScore === item.score;
                    return (
                      <button
                        key={item.score}
                        onClick={() => updateJournal(selectedDayObj.day, 'confidence', item.score)}
                        className={`sp-journal-score-btn ${active ? 'active' : ''}`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scratchpad 1: Pattern & Invariants */}
              <div className="space-y-2">
                <label className="sp-journal-section-label" style={{ color: '#4f46e5' }}>
                  <Code2 size={16} className="shrink-0" />
                  <span>1. Algorithmic Pattern &amp; State Transition Notes</span>
                </label>
                <textarea
                  rows={4}
                  value={journals[selectedDayObj.day]?.patternNotes || ''}
                  onFocus={() => { isTypingRef.current = true; }}
                  onBlur={() => { isTypingRef.current = false; }}
                  onChange={(e) => updateJournal(selectedDayObj.day, 'patternNotes', e.target.value)}
                  placeholder="Write the core invariant, recurrence relation, or pointer movement rule in your own words..."
                  className="sp-journal-textarea"
                />
              </div>

              {/* Scratchpad 2: Edge Cases & Big-O */}
              <div className="space-y-2">
                <label className="sp-journal-section-label" style={{ color: '#d97706' }}>
                  <AlertCircle size={16} className="shrink-0" />
                  <span>2. Edge Cases &amp; Time / Space Complexity Log</span>
                </label>
                <textarea
                  rows={3}
                  value={journals[selectedDayObj.day]?.edgeCases || ''}
                  onFocus={() => { isTypingRef.current = true; }}
                  onBlur={() => { isTypingRef.current = false; }}
                  onChange={(e) => updateJournal(selectedDayObj.day, 'edgeCases', e.target.value)}
                  placeholder="e.g., Empty input, single node, negative numbers, integer overflow. Time: O(N log K), Space: O(K)..."
                  className="sp-journal-textarea"
                />
              </div>

              {/* Scratchpad 3: System Design */}
              <div className="space-y-2">
                <label className="sp-journal-section-label" style={{ color: '#0284c7' }}>
                  <Server size={16} className="shrink-0" />
                  <span>3. System Design Trade-offs, QPS Math &amp; Bottlenecks</span>
                </label>
                <textarea
                  rows={4}
                  value={journals[selectedDayObj.day]?.systemDesignNotes || ''}
                  onFocus={() => { isTypingRef.current = true; }}
                  onBlur={() => { isTypingRef.current = false; }}
                  onChange={(e) => updateJournal(selectedDayObj.day, 'systemDesignNotes', e.target.value)}
                  placeholder="Jot down API contracts, DB schema choices (SQL vs NoSQL), partitioning key, and single points of failure..."
                  className="sp-journal-textarea"
                />
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="sp-journal-footer">
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-emerald-500" /> Auto-saved to local storage
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Settings & Cross-Laptop Sync Modal */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border sp-border sp-surface p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="sp-icon-md text-indigo-400" />
                <h3 className="text-base font-bold">Workspace Settings &amp; Sync</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="sprint-icon-btn p-1 sp-text-muted hover:text-rose-400"
              >
                <X size={18} className="sp-icon-md" />
              </button>
            </div>

            {/* Sprint Schedule & Dynamic Start Date */}
            <div className="p-4 rounded-xl border sp-border sp-input-bg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Sprint Start Date &amp; Timeline
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded border sp-phase-1">
                  40-Day Trajectory
                </span>
              </div>

              <p className="text-xs sp-text-muted leading-relaxed">
                Choose when Day 1 begins. The entire 40-day calendar, Sunday review cadence, and countdown deadline dynamically recalibrate to your personal start date.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleUpdateStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border sp-border sp-surface sp-text font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={() => handleUpdateStartDate(new Date().toISOString().slice(0, 10))}
                  className="px-3 py-2 rounded-lg border sp-border sp-surface hover:bg-indigo-600/15 hover:text-indigo-400 text-xs font-semibold shrink-0 transition-colors"
                  title="Recalibrate sprint to start today"
                >
                  Start Today
                </button>
              </div>

              <div className="text-[11px] sp-text-muted flex items-center justify-between pt-1">
                <span>Day 1: <strong className="sp-text">{sprintTimeline.startInfo.date} ({sprintTimeline.startInfo.weekday})</strong></span>
                <span>Day 40 Target: <strong className="sp-text">{sprintTimeline.endInfo.date} ({sprintTimeline.endInfo.weekday})</strong></span>
              </div>
            </div>

            {/* Cross-Laptop Sync (Share Module Pattern) */}
            <div className="p-4 rounded-xl border sp-border sp-input-bg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Cross-Laptop Sync Room
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${cloudStatus === 'connected'
                    ? 'sp-cloud-connected'
                    : cloudStatus === 'syncing'
                      ? 'sp-cloud-syncing'
                      : 'sp-cloud-local'
                    }`}
                >
                  {cloudStatus === 'connected'
                    ? '● Live Cloud Connected'
                    : cloudStatus === 'syncing'
                      ? '● Syncing...'
                      : '● Local Cache'}
                </span>
              </div>

              <p className="text-xs sp-text-muted leading-relaxed">
                Connect your office and home laptops to the same room key. Progress auto-syncs across both devices.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium sp-text-muted">
                  Active Room Key:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="e.g. s4821 or my-prep"
                    className="flex-1 px-3 py-2 text-xs rounded-lg border sp-border sp-surface sp-text font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleConnectKey}
                    className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition-colors"
                  >
                    Connect Room
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border sp-border sp-surface text-xs font-medium transition-colors hover:text-indigo-400"
                >
                  <Copy size={14} className="sp-icon-sm text-indigo-400" />
                  <span>Copy Sync Link</span>
                </button>

                <button
                  onClick={handleForcePull}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border sp-border sp-surface text-xs font-medium transition-colors hover:text-sky-400"
                >
                  <RefreshCw size={14} className="sp-icon-sm text-sky-400" />
                  <span>Pull Progress</span>
                </button>
              </div>

              {lastSyncedTime && (
                <div className="text-[10px] sp-text-subtle pt-1">
                  Last synced: {lastSyncedTime.toLocaleTimeString()} ({lastSyncedTime.toLocaleDateString()})
                </div>
              )}
            </div>

            {/* Offline JSON Backup */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider sp-text-muted">
                Offline Backup &amp; Migration
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportBackup}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border sp-border sp-surface text-xs font-semibold transition-colors hover:text-emerald-400"
                >
                  <Download size={16} className="sp-icon-md text-emerald-400" />
                  <span>Export JSON</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border sp-border sp-surface text-xs font-semibold transition-colors hover:text-sky-400"
                >
                  <Upload size={16} className="sp-icon-md text-sky-400" />
                  <span>Import JSON</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </div>
            </div>

            {/* Reset */}
            <div className="pt-4 border-t sp-border">
              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors"
                >
                  <Trash2 size={14} className="sp-icon-sm" />
                  <span>Reset All Progress</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2.5 text-center">
                  <p className="text-xs text-rose-300 font-medium">
                    Erase all {stats.totalDays} days of progress and journal notes?
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-1.5 rounded-lg border sp-border text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeResetProgress}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                    >
                      Yes, Wipe Everything
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
