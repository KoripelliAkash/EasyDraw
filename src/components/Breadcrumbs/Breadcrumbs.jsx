import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import styles from './Breadcrumbs.module.css';

export const Breadcrumbs = ({ items = [], currentTitle = '' }) => {
  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      <Link to="/" className={styles.crumbLink} title="Workspace Root">
        <Home size={14} className={styles.icon} />
        <span>Workspace</span>
      </Link>

      {items.map((item) => (
        <div key={item.id} className={styles.crumbItem}>
          <ChevronRight size={13} className={styles.separator} />
          <Link to={`/folder/${item.id}`} className={styles.crumbLink}>
            {item.name}
          </Link>
        </div>
      ))}

      {currentTitle && (
        <div className={styles.crumbItem}>
          <ChevronRight size={13} className={styles.separator} />
          <span className={styles.current} aria-current="page">
            {currentTitle}
          </span>
        </div>
      )}
    </nav>
  );
};
