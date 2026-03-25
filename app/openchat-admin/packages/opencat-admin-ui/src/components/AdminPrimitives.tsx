import { ButtonHTMLAttributes, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  classNames,
  formatDateTime,
  formatJson,
  formatNumber,
} from '@openchat/opencat-admin-commons';
export { classNames, formatDateTime, formatJson, formatNumber } from '@openchat/opencat-admin-commons';

function inferTone(value: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  const normalized = value.toLowerCase();
  if (/(healthy|online|active|accepted|joined|success|sent|read|configured|synced)/.test(normalized)) {
    return 'success';
  }
  if (/(warning|pending|busy|processing|approval|unknown)/.test(normalized)) {
    return 'warning';
  }
  if (/(error|failed|offline|blocked|banned|dismissed|recalled|unhealthy|deleted|forbidden|rejected)/.test(normalized)) {
    return 'danger';
  }
  if (/(info|group|system|event)/.test(normalized)) {
    return 'info';
  }
  return 'neutral';
}

export function StatusBadge({
  value,
  tone,
}: {
  value: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const resolvedTone = tone || inferTone(value);

  return (
    <span
      className={classNames(
        'status-badge',
        resolvedTone === 'success' && 'status-badge-success',
        resolvedTone === 'warning' && 'status-badge-warning',
        resolvedTone === 'danger' && 'status-badge-danger',
        resolvedTone === 'info' && 'status-badge-info',
        resolvedTone === 'neutral' && 'status-badge-neutral',
      )}
    >
      {value}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function SurfaceCard({
  title,
  subtitle,
  actions,
  children,
  compact,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={classNames('surface-card', compact && 'surface-card-compact')}>
      {title || subtitle || actions ? (
        <header className="surface-card-header">
          <div>
            {title ? <h2 className="surface-card-title">{title}</h2> : null}
            {subtitle ? <p className="surface-card-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      {hint ? <p className="metric-hint">{hint}</p> : null}
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="filter-bar">{children}</div>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  start: number;
  end: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function getPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const normalizedLimit = limit > 0 ? limit : 1;
  const normalizedTotal = Math.max(total, 0);
  const totalPages = normalizedTotal === 0 ? 0 : Math.ceil(normalizedTotal / normalizedLimit);
  const normalizedPage = totalPages === 0
    ? 1
    : Math.min(Math.max(page, 1), totalPages);

  if (normalizedTotal === 0) {
    return {
      page: normalizedPage,
      limit: normalizedLimit,
      total: normalizedTotal,
      totalPages,
      start: 0,
      end: 0,
      hasPrevious: false,
      hasNext: false,
    };
  }

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    total: normalizedTotal,
    totalPages,
    start: (normalizedPage - 1) * normalizedLimit + 1,
    end: Math.min(normalizedPage * normalizedLimit, normalizedTotal),
    hasPrevious: normalizedPage > 1,
    hasNext: normalizedPage < totalPages,
  };
}

export function PaginationControls({
  page,
  limit,
  total,
  noun = 'records',
  onPageChange,
}: {
  page: number;
  limit: number;
  total: number;
  noun?: string;
  onPageChange: (page: number) => void;
}) {
  const meta = getPaginationMeta(page, limit, total);

  return (
    <div className="pagination-bar">
      <p className="pagination-summary">
        {meta.total === 0
          ? `No ${noun} found.`
          : `Showing ${meta.start}-${meta.end} of ${meta.total} ${noun}. Page ${meta.page} of ${meta.totalPages}.`}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-muted"
          disabled={!meta.hasPrevious}
          onClick={() => onPageChange(meta.page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-muted"
          disabled={!meta.hasNext}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function InfoGrid({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <div className="info-grid">
      {items.map((item) => (
        <div key={item.label} className="info-grid-item">
          <p className="info-grid-label">{item.label}</p>
          <div className="info-grid-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function LoadingState({ label = 'Loading operational data...' }: { label?: string }) {
  return (
    <div className="state-block">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="state-block state-empty">
      <p className="state-title">{title}</p>
      {description ? <p className="state-description">{description}</p> : null}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  retry,
}: {
  title: string;
  description?: string;
  retry?: () => void;
}) {
  return (
    <div className="state-block state-error">
      <p className="state-title">{title}</p>
      {description ? <p className="state-description">{description}</p> : null}
      {retry ? (
        <button className="btn btn-critical" onClick={retry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function SkeletonBlock({
  className,
}: {
  className?: string;
}) {
  return <div className={classNames('skeleton-block animate-pulse', className)} />;
}

export function InlineNotice({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={classNames(
        'notice-banner',
        tone === 'info' && 'notice-banner-info',
        tone === 'success' && 'notice-banner-success',
        tone === 'warning' && 'notice-banner-warning',
        tone === 'danger' && 'notice-banner-danger',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function InsetCard({
  tone = 'default',
  className,
  children,
}: {
  tone?: 'default' | 'muted' | 'info' | 'warning' | 'danger';
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={classNames(
        'inset-card',
        tone === 'muted' && 'inset-card-muted',
        tone === 'info' && 'inset-card-info',
        tone === 'warning' && 'inset-card-warning',
        tone === 'danger' && 'inset-card-danger',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SelectableCard({
  active,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      {...props}
      className={classNames('selection-card', active && 'selection-card-active', className)}
    >
      {children}
    </button>
  );
}

export function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <pre className={classNames('code-block', className)}>{children}</pre>;
}

export function SectionNav({
  to,
  label,
  description,
}: {
  to: string;
  label: string;
  description: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => classNames('section-nav', isActive && 'section-nav-active')}
    >
      <span className="section-nav-label">{label}</span>
      <span className="section-nav-description">{description}</span>
    </NavLink>
  );
}
