import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AGENT_INFO } from '../types';
import { AGENT_CARDS } from '../agent-cards';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  tipo: string;
  conteudo: any;
  editable?: boolean;
  onChange?: (newConteudo: any) => void;
  agentInfo?: Record<string, { name: string; icon: string; color: string; description: string }>;
}

export function ArtifactRenderer({ tipo, conteudo, editable = false, onChange, agentInfo }: Props) {
  if (!conteudo) return <p className="text-sm text-muted-foreground">Sem conteúdo</p>;

  const resolvedInfo = agentInfo || AGENT_INFO;
  const info = resolvedInfo[tipo];
  const card = AGENT_CARDS[tipo];

  const update = (path: string[], value: any) => {
    if (!onChange) return;
    const next = JSON.parse(JSON.stringify(conteudo));
    let ref = next;
    for (let i = 0; i < path.length - 1; i++) {
      ref = ref[path[i]];
    }
    ref[path[path.length - 1]] = value;
    onChange(next);
  };

  // Flatten top-level keys into numbered sections
  const sections = Object.entries(conteudo).filter(([, v]) => v !== null && v !== undefined);

  return (
    <div className="space-y-4">
      {/* ─── Agent Header ─── */}
      <div
        className="rounded-xl border p-4 space-y-2"
        style={{ borderColor: `${info?.color || '#6366F1'}30`, backgroundColor: `${info?.color || '#6366F1'}08` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{info?.icon || '📄'}</span>
          <h2 className="font-bold text-base text-foreground">{info?.name || tipo}</h2>
        </div>
        {card?.mission && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Missão:</span> {card.mission}
          </p>
        )}
        {card?.role && (
          <p className="text-xs text-muted-foreground leading-relaxed">{card.role}</p>
        )}
        {!card && info?.description && (
          <p className="text-sm text-muted-foreground">{info.description}</p>
        )}
      </div>

      {/* ─── Numbered Sections ─── */}
      {sections.map(([key, value], idx) => (
        <SectionBlock
          key={key}
          sectionKey={key}
          value={value}
          index={idx + 1}
          editable={editable}
          update={update}
          basePath={[key]}
          accentColor={info?.color || '#6366F1'}
        />
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function safeString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Section Block (top-level key) ──────────────────────────────────────

function SectionBlock({ sectionKey, value, index, editable, update, basePath, accentColor }: {
  sectionKey: string;
  value: any;
  index: number;
  editable: boolean;
  update: (path: string[], value: any) => void;
  basePath: string[];
  accentColor: string;
}) {
  const label = formatLabel(sectionKey);

  // Primitive
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return (
      <div className="rounded-lg border bg-card overflow-hidden">
        <SectionHeader index={index} label={label} color={accentColor} />
        <div className="p-4">
          {editable ? (
            typeof value === 'string' && String(value).length > 80 ? (
              <Textarea
                value={safeString(value)}
                onChange={e => update(basePath, e.target.value)}
                className="text-sm min-h-[60px] resize-y"
                rows={3}
              />
            ) : (
              <Input
                value={safeString(value)}
                onChange={e => update(basePath, e.target.value)}
                className="text-sm"
              />
            )
          ) : (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">{safeString(value)}</p>
          )}
        </div>
      </div>
    );
  }

  // Array
  if (Array.isArray(value)) {
    return (
      <div className="rounded-lg border bg-card overflow-hidden">
        <SectionHeader index={index} label={label} color={accentColor} count={value.length} />
        <div className="p-4 space-y-2">
          {value.map((item, i) => (
            <ListItem
              key={i}
              item={item}
              index={i}
              editable={editable}
              update={update}
              basePath={basePath}
              allItems={value}
            />
          ))}
          {editable && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs w-full"
              onClick={() => {
                const newItem = typeof value[0] === 'object' && value[0] !== null
                  ? Object.fromEntries(Object.keys(value[0]).map(k => [k, '']))
                  : '';
                update(basePath, [...value, newItem]);
              }}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Object
  if (typeof value === 'object' && value !== null) {
    return (
      <div className="rounded-lg border bg-card overflow-hidden">
        <SectionHeader index={index} label={label} color={accentColor} />
        <div className="p-4 space-y-3">
          {Object.entries(value).map(([k, v]) => {
            if (v === null || v === undefined) return null;

            // Sub-arrays and sub-objects render as sub-sections
            if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
              return (
                <SubSection
                  key={k}
                  sectionKey={k}
                  value={v}
                  editable={editable}
                  update={update}
                  basePath={[...basePath, k]}
                />
              );
            }

            // Primitive inside object → key: value row
            return (
              <KeyValueRow
                key={k}
                label={formatLabel(k)}
                value={v}
                editable={editable}
                onChange={val => update([...basePath, k], val)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Uniform Section Header ─────────────────────────────────────────────

function SectionHeader({ index, label, color, count }: { index: number; label: string; color: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
      <span
        className="flex items-center justify-center w-6 h-6 rounded-md text-white text-xs font-bold shrink-0"
        style={{ backgroundColor: color }}
      >
        {index}
      </span>
      <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">{label}</h3>
      {count !== undefined && (
        <Badge variant="outline" className="text-[10px] ml-auto">{count} itens</Badge>
      )}
    </div>
  );
}

// ─── Sub-section (nested key inside an object) ──────────────────────────

function SubSection({ sectionKey, value, editable, update, basePath }: {
  sectionKey: string;
  value: any;
  editable: boolean;
  update: (path: string[], value: any) => void;
  basePath: string[];
}) {
  const label = formatLabel(sectionKey);

  if (Array.isArray(value)) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">{label}</h4>
          <Badge variant="outline" className="text-[10px]">{value.length}</Badge>
        </div>
        <div className="space-y-1.5 ml-1">
          {value.map((item, i) => (
            <ListItem
              key={i}
              item={item}
              index={i}
              editable={editable}
              update={update}
              basePath={basePath}
              allItems={value}
            />
          ))}
          {editable && (
            <Button variant="outline" size="sm" className="h-6 text-xs w-full" onClick={() => {
              const newItem = typeof value[0] === 'object' && value[0] !== null
                ? Object.fromEntries(Object.keys(value[0]).map(k => [k, '']))
                : '';
              update(basePath, [...value, newItem]);
            }}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (typeof value === 'object' && value !== null) {
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">{label}</h4>
        <div className="ml-1 space-y-2 border-l-2 border-muted pl-3">
          {Object.entries(value).map(([k, v]) => {
            if (v === null || v === undefined) return null;
            if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
              return <SubSection key={k} sectionKey={k} value={v} editable={editable} update={update} basePath={[...basePath, k]} />;
            }
            return <KeyValueRow key={k} label={formatLabel(k)} value={v} editable={editable} onChange={val => update([...basePath, k], val)} />;
          })}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Key-Value Row ──────────────────────────────────────────────────────

function KeyValueRow({ label, value, editable, onChange }: {
  label: string;
  value: any;
  editable: boolean;
  onChange: (v: any) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-medium text-muted-foreground capitalize shrink-0 min-w-[110px] pt-1.5">{label}:</span>
      <div className="flex-1 min-w-0">
        {editable ? (
          typeof value === 'string' && String(value).length > 80 ? (
            <Textarea value={safeString(value)} onChange={e => onChange(e.target.value)} className="text-sm min-h-[50px] resize-y" rows={2} />
          ) : (
            <Input value={safeString(value)} onChange={e => onChange(e.target.value)} className="text-sm" />
          )
        ) : (
          <span className="text-sm leading-relaxed break-words whitespace-pre-wrap">{safeString(value)}</span>
        )}
      </div>
    </div>
  );
}

// ─── List Item ──────────────────────────────────────────────────────────

function ListItem({ item, index, editable, update, basePath, allItems }: {
  item: any;
  index: number;
  editable: boolean;
  update: (path: string[], value: any) => void;
  basePath: string[];
  allItems: any[];
}) {
  const removeItem = () => update(basePath, allItems.filter((_, i) => i !== index));

  // Primitive
  if (typeof item !== 'object' || item === null) {
    return (
      <div className="flex items-start gap-2 group">
        <span className="text-muted-foreground shrink-0 mt-1 text-xs font-bold" style={{ minWidth: '18px' }}>{index + 1}.</span>
        {editable ? (
          <div className="flex-1 flex items-center gap-1">
            <Input
              value={safeString(item)}
              onChange={e => {
                const next = [...allItems];
                next[index] = e.target.value;
                update(basePath, next);
              }}
              className="text-sm flex-1"
            />
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100" onClick={removeItem}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ) : (
          <span className="text-sm leading-relaxed break-words whitespace-pre-wrap">{safeString(item)}</span>
        )}
      </div>
    );
  }

  // Object item → card with uniform key-value rows
  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-2 group relative">
      {editable && (
        <Button variant="ghost" size="icon" className="h-5 w-5 absolute top-2 right-2 opacity-0 group-hover:opacity-100" onClick={removeItem}>
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      )}
      {Object.entries(item).map(([k, v]) => {
        if (v === null || v === undefined) return null;

        // Nested arrays inside list items
        if (Array.isArray(v)) {
          return (
            <div key={k} className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{formatLabel(k)}:</span>
              <ul className="ml-3 space-y-0.5">
                {(v as any[]).map((subItem, si) => (
                  <li key={si} className="text-xs flex items-start gap-1.5">
                    <span className="text-muted-foreground mt-0.5 shrink-0">{si + 1}.</span>
                    {editable ? (
                      <Input
                        value={safeString(subItem)}
                        onChange={e => {
                          const newArr = [...(v as any[])];
                          newArr[si] = e.target.value;
                          const next = [...allItems];
                          next[index] = { ...item, [k]: newArr };
                          update(basePath, next);
                        }}
                        className="text-xs flex-1"
                      />
                    ) : (
                      <span className="break-words whitespace-pre-wrap">{safeString(subItem)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        // Nested object inside list items
        if (typeof v === 'object' && v !== null) {
          return (
            <div key={k} className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{formatLabel(k)}:</span>
              <div className="ml-2 space-y-1 border-l-2 border-muted pl-2">
                {Object.entries(v as Record<string, any>).map(([sk, sv]) => (
                  <div key={sk} className="flex items-start gap-1.5 text-xs">
                    <span className="text-muted-foreground capitalize shrink-0 font-medium">{formatLabel(sk)}:</span>
                    <span className="break-words whitespace-pre-wrap">{safeString(sv)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div key={k} className="flex items-start gap-2">
            <span className="text-xs font-medium text-muted-foreground capitalize shrink-0 min-w-[80px]">{formatLabel(k)}:</span>
            {editable ? (
              <Input
                value={safeString(v)}
                onChange={e => {
                  const next = [...allItems];
                  next[index] = { ...item, [k]: e.target.value };
                  update(basePath, next);
                }}
                className="text-xs flex-1"
              />
            ) : (
              <span className="text-sm break-words whitespace-pre-wrap">{safeString(v)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
