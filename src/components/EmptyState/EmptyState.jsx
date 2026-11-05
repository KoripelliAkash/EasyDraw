import { sound } from '../../utils/audio.js';
import styles from './EmptyState.module.css';

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div className={styles.emptyContainer}>
      <div className={styles.iconCircle}>
        <Icon size={20} className={styles.icon} />
      </div>
      <span className={styles.schematicBadge}>[DRAFTING CANVASES]</span>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {(actionLabel || secondaryActionLabel) && (
        <div className={styles.actionRow}>
          {actionLabel && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => {
                sound.playClick();
                onAction();
              }}
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => {
                sound.playClick();
                onSecondaryAction();
              }}
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
