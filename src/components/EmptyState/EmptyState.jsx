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
        <Icon size={24} className={styles.icon} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {(actionLabel || secondaryActionLabel) && (
        <div className={styles.actionRow}>
          {actionLabel && (
            <button type="button" className={styles.primaryBtn} onClick={onAction}>
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
