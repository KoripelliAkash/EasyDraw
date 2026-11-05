import { Compass, Volume2, VolumeX, Grid, Square } from 'lucide-react';
import { sound } from '../../utils/audio.js';
import styles from './CanvasStatusBar.module.css';

export const CanvasStatusBar = ({
  cursorCoords = { x: 0, y: 0 },
  zoom = 1,
  elementCount = 0,
  selectedCount = 0,
  activeTool = 'selection',
  saveStatus = 'saved',
  isSoundEnabled = true,
  onToggleSound,
  isMinimapVisible = true,
  onToggleMinimap,
  currentPreset = 'grid',
  onCyclePreset,
  onResetZoom,
}) => {
  const zoomPct = Math.round(zoom * 100);

  return (
    <footer className={styles.statusBar} role="status" aria-label="Canvas Telemetry">
      {/* Left: Telemetry Data Stream */}
      <div className={styles.leftCluster}>
        {/* Sync Status Dot */}
        <div className={styles.statItem} title={`IndexedDB Status: ${saveStatus}`}>
          <div
            className={`${styles.statusDot} ${
              saveStatus === 'saving'
                ? styles.statusDotSaving
                : saveStatus === 'dirty'
                ? styles.statusDotDirty
                : ''
            }`}
          />
          <span className={styles.statValue}>
            {saveStatus === 'saving'
              ? 'SAVING [IDB]...'
              : saveStatus === 'dirty'
              ? 'UNSAVED'
              : 'LOCAL-FIRST [IDB] • SYNCED'}
          </span>
        </div>

        <div className={styles.divider} />

        {/* Cursor Coordinates */}
        <div className={styles.statItem} title="Active Cursor World Coordinates">
          <span className={styles.statLabel}>COORD:</span>
          <span className={styles.statValue}>
            X: {cursorCoords.x} Y: {cursorCoords.y}
          </span>
        </div>

        <div className={styles.divider} />

        {/* Active Tool */}
        <div className={styles.statItem} title="Active Drawing Tool">
          <span className={styles.statLabel}>TOOL:</span>
          <span className={styles.statValue}>[{activeTool.toUpperCase()}]</span>
        </div>

        <div className={styles.divider} />

        {/* Scene Elements Count */}
        <div className={styles.statItem} title="Total Elements in Scene">
          <span className={styles.statLabel}>ELEMENTS:</span>
          <span className={styles.statValue}>
            {elementCount}
            {selectedCount > 0 && ` (${selectedCount} sel)`}
          </span>
        </div>

        <div className={styles.divider} />

        {/* Zoom scale percentage */}
        <button
          type="button"
          className={styles.interactivePill}
          onClick={() => {
            sound.playClick();
            onResetZoom?.();
          }}
          title="Zoom Level (Click to reset 100%)"
        >
          <span className={styles.statLabel}>ZOOM:</span>
          <span>{zoomPct}%</span>
        </button>
      </div>

      {/* Right: Tactical Control Toggles */}
      <div className={styles.rightCluster}>
        {/* Canvas Style Pill (Grid / No Grid) */}
        <button
          type="button"
          className={styles.interactivePill}
          onClick={() => {
            sound.playSwitch();
            onCyclePreset?.();
          }}
          title="Click to toggle canvas style (Grid / No Grid)"
        >
          {currentPreset === 'grid' ? <Grid size={11} /> : <Square size={11} />}
          <span>CANVAS: {currentPreset === 'grid' ? 'GRID' : 'NO GRID'}</span>
        </button>

        {/* Minimap Radar Toggle */}
        <button
          type="button"
          className={`${styles.interactivePill} ${isMinimapVisible ? styles.activePill : ''}`}
          onClick={() => {
            sound.playClick();
            onToggleMinimap?.();
          }}
          title="Toggle Radar Minimap [M]"
        >
          <Compass size={11} />
          <span>RADAR</span>
        </button>

        {/* Mechanical Sound Toggle */}
        <button
          type="button"
          className={`${styles.interactivePill} ${isSoundEnabled ? styles.activePill : ''}`}
          onClick={() => {
            onToggleSound?.();
          }}
          title="Toggle Mechanical Audio Feedback [S]"
        >
          {isSoundEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
          <span>AUDIO</span>
        </button>
      </div>
    </footer>
  );
};
