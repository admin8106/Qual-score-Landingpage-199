import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X, ExternalLink, Calendar, Clock, CheckCircle, AlertTriangle,
  Minus, User, Briefcase, MapPin, TrendingUp, RefreshCw,
  MessageSquare, Mail, Send, Loader2,
} from 'lucide-react';
import { adminApi, type AdminLeadRecord, type AdminLeadDetail, type CommEvent } from '../../api/services/admin';
import {
  BAND_LABELS, BAND_COLORS, TAG_LABELS, TAG_COLORS,
  bandFromLabel, formatDate, SECTION_LABELS,
} from '../../services/adminService';

interface Props {
  lead: AdminLeadRecord;
  onClose: () => void;
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct   = Math.min((score / max) * 100, 100);
  const color = score >= 7 ? '#10B981' : score >= 5 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono text-slate-400 w-8 text-right shrink-0">{score.toFixed(1)}</span>
    </div>
  );
}

// ─── Status dot ───────────────────────────────────────────────────────────────

type Strength = 'Strong' | 'Fair' | 'Weak';

function statusLevel(score: number): Strength {
  if (score >= 7) return 'Strong';
  if (score >= 5) return 'Fair';
  return 'Weak';
}

function StatusDot({ status }: { status: Strength }) {
  const colors = { Strong: 'text-emerald-400', Fair: 'text-amber-400', Weak: 'text-red-400' };
  const Icon   = status === 'Strong' ? CheckCircle : status === 'Fair' ? Minus : AlertTriangle;
  return <Icon className={`w-3.5 h-3.5 ${colors[status]} shrink-0`} />;
}

// ─── Section for label ────────────────────────────────────────────────────────

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">{title}</p>
      {children}
    </section>
  );
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

const DELIVERY_STATUS_CONFIG: Record<CommEvent['deliveryStatus'], { label: string; cls: string }> = {
  SENT:      { label: 'Sent',      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  DELIVERED: { label: 'Delivered', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  FAILED:    { label: 'Failed',    cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  RETRIED:   { label: 'Retried',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  PENDING:   { label: 'Pending',   cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  QUEUED:    { label: 'Queued',    cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  SKIPPED:   { label: 'Skipped',   cls: 'bg-slate-700/40 text-slate-600 border-slate-700/20' },
};

export default function LeadDetailDrawer({ lead, onClose }: Props) {
  const [detail, setDetail]       = useState<AdminLeadDetail | null>(null);
  const [fetching, setFetching]   = useState(true);
  const [fetchErr, setFetchErr]   = useState('');
  const [comms, setComms]         = useState<CommEvent[]>([]);
  const [commsLoading, setCommsLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    setFetchErr('');
    setDetail(null);
    setComms([]);
    setResendMsg('');

    adminApi.getLead(lead.candidateCode).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setDetail(result.data);
      } else {
        setFetchErr(result.error.message || 'Could not load detail.');
      }
      setFetching(false);
    }).catch(() => {
      if (cancelled) return;
      setFetchErr('Network error — could not load detail.');
      setFetching(false);
    });

    setCommsLoading(true);
    adminApi.getComms(lead.candidateCode).then((result) => {
      if (cancelled) return;
      if (result.ok) setComms(result.data ?? []);
      setCommsLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setCommsLoading(false);
    });

    return () => { cancelled = true; };
  }, [lead.candidateCode]);

  const handleResend = useCallback(async () => {
    if (resending || resendCooldown) return;
    setResending(true);
    setResendCooldown(true);
    setResendMsg('');
    const result = await adminApi.resend(lead.candidateCode);
    if (!mountedRef.current) return;
    setResending(false);
    if (result.ok) {
      setResendMsg('Resend triggered. Messages will arrive within a few seconds.');
      const commsResult = await adminApi.getComms(lead.candidateCode);
      if (!mountedRef.current) return;
      if (commsResult.ok) setComms(commsResult.data ?? []);
    } else {
      setResendMsg('Resend failed: ' + (result.error.message || 'Unknown error'));
    }
    setTimeout(() => {
      if (mountedRef.current) setResendCooldown(false);
    }, 30_000);
  }, [lead.candidateCode, resending, resendCooldown]);

  const src     = detail ?? lead;
  const bandKey = bandFromLabel(src.bandLabel);
  const tags    = src.tags ?? [];

  const sectionScores = detail?.sectionScores;
  const liAnalysis    = detail?.linkedInAnalysis;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-xl z-50 bg-[#0D1120] border-l border-white/[0.08] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0">
          <div>
            <h2 className="font-semibold text-white text-base">{src.fullName}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{src.email}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Candidate ref */}
        <div className="px-6 py-2 border-b border-white/[0.04] shrink-0">
          <span className="text-xs text-slate-600">Ref: </span>
          <span className="font-mono text-xs text-slate-400">{src.candidateCode}</span>
          {src.leadPriority && (
            <span className={`ml-3 text-xs font-semibold px-2 py-0.5 rounded-full border ${
              src.leadPriority.toUpperCase() === 'HIGH'
                ? 'text-red-400 bg-red-500/10 border-red-500/20'
                : src.leadPriority.toUpperCase() === 'MEDIUM'
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                  : 'text-slate-500 bg-white/[0.03] border-white/[0.06]'
            }`}>
              {src.leadPriority} Priority
            </span>
          )}
        </div>

        {/* Loading overlay */}
        {fetching && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-xs text-slate-500">Loading detail...</p>
          </div>
        )}

        {/* Error state */}
        {!fetching && fetchErr && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <p className="text-xs text-amber-400">{fetchErr}</p>
            <p className="text-xs text-slate-600 text-center">Showing available list-level data below.</p>
          </div>
        )}

        {/* Body */}
        {!fetching && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* ── Profile ── */}
            <DetailSection title="Candidate Profile">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 grid grid-cols-2 gap-3">
                {[
                  { Icon: Briefcase, label: 'Current Role', value: src.currentRole || '—' },
                  { Icon: TrendingUp, label: 'Experience',  value: src.yearsExperience != null ? `${src.yearsExperience} yrs` : '—' },
                  { Icon: MapPin,    label: 'Location',     value: src.location || '—' },
                  { Icon: User,      label: 'Career Stage', value: src.careerStage === 'fresher' ? 'Fresher' : src.careerStage === 'working_professional' ? 'Working Professional' : src.careerStage || '—' },
                ].map(({ Icon, label, value }) => (
                  <div key={label}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon className="w-3 h-3 text-slate-600" />
                      <p className="text-xs text-slate-600">{label}</p>
                    </div>
                    <p className="text-xs text-slate-300">{value}</p>
                  </div>
                ))}

                <div className="col-span-2">
                  <p className="text-xs text-slate-600 mb-0.5">Industry</p>
                  <p className="text-xs text-slate-300">{src.industry || '—'}</p>
                </div>

                {src.mobileNumber && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-600 mb-0.5">Phone</p>
                    <p className="text-xs text-slate-300">{src.mobileNumber}</p>
                  </div>
                )}

                {src.linkedinUrl && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-600 mb-1">LinkedIn</p>
                    <a
                      href={src.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors break-all"
                    >
                      {src.linkedinUrl.replace('https://', '')}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </DetailSection>

            {/* ── Score / band ── */}
            {src.finalEmployabilityScore != null && bandKey && (
              <DetailSection title="Employability Score">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-center gap-5">
                  <div
                    className="w-16 h-16 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: bandKey === 'critical' ? '#EF4444' : bandKey === 'needs_optimization' ? '#F59E0B' : '#10B981' }}
                  >
                    <span className="text-xl font-bold text-white">{src.finalEmployabilityScore.toFixed(1)}</span>
                  </div>
                  <div>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mb-1.5 ${BAND_COLORS[bandKey].bg} ${BAND_COLORS[bandKey].text}`}>
                      <div className={`w-1 h-1 rounded-full ${BAND_COLORS[bandKey].dot}`} />
                      {BAND_LABELS[bandKey]}
                    </div>
                    {detail?.reportTagline && (
                      <p className="text-xs text-slate-500 italic mt-1">{detail.reportTagline}</p>
                    )}
                    {sectionScores?.linkedinScore != null && (
                      <p className="text-xs text-slate-500 mt-1">
                        LinkedIn Score: <span className="text-slate-300">{sectionScores.linkedinScore.toFixed(1)}/10</span>
                      </p>
                    )}
                  </div>
                </div>
              </DetailSection>
            )}

            {/* ── Section scores ── */}
            {sectionScores && (
              <DetailSection title="Section Scores">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
                  {(Object.entries(sectionScores) as [string, number | undefined][])
                    .filter(([key, val]) => val != null && key !== 'linkedinScore')
                    .map(([key, val]) => (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <StatusDot status={statusLevel(val as number)} />
                            <span className="text-xs text-slate-400">{SECTION_LABELS[key] ?? key}</span>
                          </div>
                        </div>
                        <ScoreBar score={val as number} />
                      </div>
                    ))
                  }
                </div>
              </DetailSection>
            )}

            {/* ── Top gaps ── */}
            {detail?.topGaps && detail.topGaps.length > 0 && (
              <DetailSection title="Top Gaps">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <ul className="space-y-2">
                    {detail.topGaps.map((g, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                        <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              </DetailSection>
            )}

            {/* ── Recommendation ── */}
            {detail?.recommendation && (
              <DetailSection title="Recommendation">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <p className="text-xs text-slate-400 leading-relaxed">{detail.recommendation}</p>
                </div>
              </DetailSection>
            )}

            {/* ── LinkedIn analysis ── */}
            {liAnalysis && (
              <DetailSection title="LinkedIn Analysis">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
                  {liAnalysis.topStrengths && liAnalysis.topStrengths.length > 0 && (
                    <div>
                      <p className="text-xs text-emerald-400 font-medium mb-2">Strengths</p>
                      <ul className="space-y-1">
                        {liAnalysis.topStrengths.slice(0, 3).map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                            <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {liAnalysis.topConcerns && liAnalysis.topConcerns.length > 0 && (
                    <div>
                      <p className="text-xs text-amber-400 font-medium mb-2">Concerns</p>
                      <ul className="space-y-1">
                        {liAnalysis.topConcerns.slice(0, 3).map((c, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                            <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { label: 'Headline',      val: liAnalysis.headlineClarity },
                      { label: 'Completeness',  val: liAnalysis.profileCompleteness },
                      { label: 'Proof of Work', val: liAnalysis.proofOfWorkVisibility },
                    ].filter((x) => x.val != null).map(({ label, val }) => (
                      <div key={label} className="bg-white/[0.03] rounded-lg p-2 text-center">
                        <p className="text-xs font-semibold text-white">{(val as number).toFixed(0)}<span className="text-slate-600">/10</span></p>
                        <p className="text-xs text-slate-600 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  {liAnalysis.recommendation && (
                    <p className="text-xs text-slate-500 leading-relaxed pt-1 border-t border-white/[0.04]">
                      {liAnalysis.recommendation}
                    </p>
                  )}
                </div>
              </DetailSection>
            )}

            {/* ── Tags ── */}
            {tags.length > 0 && (
              <DetailSection title="CRM Tags">
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${TAG_COLORS[tag] ?? 'bg-slate-500/10 text-slate-400'}`}
                    >
                      {TAG_LABELS[tag] ?? tag}
                    </span>
                  ))}
                </div>
              </DetailSection>
            )}

            {/* ── Consultation ── */}
            <DetailSection title="Consultation Status">
              {src.consultationBooked ? (
                <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">
                      Consultation {src.consultationStatus === 'CONFIRMED' ? 'Confirmed' : 'Booked'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {src.consultationDate && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {src.consultationDate}
                      </div>
                    )}
                    {src.consultationTime && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        {src.consultationTime}
                      </div>
                    )}
                    {src.consultationRef && (
                      <p className="text-xs text-slate-600 mt-1">
                        Ref: <span className="font-mono text-slate-400">{src.consultationRef}</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
                  <p className="text-xs text-slate-500">No consultation booked yet</p>
                </div>
              )}
            </DetailSection>

            {/* ── Communications ── */}
            <DetailSection title="Communication History">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-slate-600">
                    {commsLoading ? 'Loading...' : `${comms.length} event${comms.length !== 1 ? 's' : ''}`}
                  </p>
                  <button
                    onClick={handleResend}
                    disabled={resending || resendCooldown}
                    title={resendCooldown && !resending ? 'Resend available again in 30 seconds' : undefined}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resending
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Sending...</>
                      : resendCooldown
                        ? <><Send className="w-3 h-3" /> Sent</>
                        : <><Send className="w-3 h-3" /> Resend Report</>
                    }
                  </button>
                </div>

                {resendMsg && (
                  <div className={`text-xs px-3 py-2 rounded-lg border ${
                    resendMsg.startsWith('Resend triggered')
                      ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/8 border-red-500/20 text-red-400'
                  }`}>
                    {resendMsg}
                  </div>
                )}

                {commsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
                  </div>
                ) : comms.length === 0 ? (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-slate-600">No communications sent yet.</p>
                  </div>
                ) : (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
                    {comms.slice(0, 8).map((evt, i) => {
                      const cfg = DELIVERY_STATUS_CONFIG[evt.deliveryStatus] ?? DELIVERY_STATUS_CONFIG.PENDING;
                      const ChannelIcon = evt.channelType === 'WHATSAPP' ? MessageSquare : Mail;
                      const isLast = i === Math.min(comms.length, 8) - 1 && comms.length <= 8;
                      return (
                        <div
                          key={evt.id}
                          className={`flex items-center gap-3 px-4 py-2.5 ${!isLast ? 'border-b border-white/[0.04]' : ''}`}
                        >
                          <ChannelIcon className={`w-3.5 h-3.5 shrink-0 ${evt.channelType === 'WHATSAPP' ? 'text-emerald-500' : 'text-blue-400'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-400 truncate">{evt.templateCode.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-slate-700">{new Date(evt.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          {evt.errorMessage && (
                            <span className="text-[10px] text-red-500/60 truncate max-w-[80px]" title={evt.errorMessage}>
                              {evt.errorMessage.slice(0, 30)}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                        </div>
                      );
                    })}
                    {comms.length > 8 && (
                      <div className="px-4 py-2 border-t border-white/[0.04] text-center">
                        <p className="text-xs text-slate-600">
                          {comms.length - 8} more event{comms.length - 8 !== 1 ? 's' : ''} not shown
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DetailSection>

            {/* ── Lead metadata ── */}
            <DetailSection title="Lead Metadata">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
                {[
                  { label: 'Lead Created',     value: formatDate(src.createdAt) },
                  { label: 'Payment Status',   value: src.paymentStatus ?? '—' },
                  { label: 'Payment Ref',      value: src.paymentReference ?? '—' },
                  { label: 'Report Status',    value: src.reportStatus ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">{label}</span>
                    <span className="text-xs text-slate-300">{value}</span>
                  </div>
                ))}
              </div>
            </DetailSection>

            {/* fetch error notice if partial data */}
            {fetchErr && (
              <div className="flex items-center gap-2 bg-amber-500/8 border border-amber-500/15 rounded-xl px-4 py-3">
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-400">Detail fetch failed — showing list-level data only.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
