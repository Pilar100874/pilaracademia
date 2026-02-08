import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Activity, Plus, Trash2, ChevronDown, Pencil, Check, Clock, TrendingUp, UtensilsCrossed, AlertTriangle } from 'lucide-react';
import { useGlycemiaEntries, MEASUREMENT_TYPES, getGlycemiaStatus, GlycemiaEntry } from '@/hooks/useGlycemiaEntries';
import { useFoodEntries } from '@/hooks/useFoodEntries';
import { calculateGlycemicImpact } from '@/lib/glycemicImpact';
import { format } from 'date-fns';

interface GlycemiaTrackerProps {
  selectedDate?: Date;
}

export function GlycemiaTracker({ selectedDate }: GlycemiaTrackerProps) {
  const { 
    entries, 
    addGlycemiaEntry, 
    updateGlycemiaEntry, 
    deleteGlycemiaEntry, 
    getLatestReading,
    getAverageToday 
  } = useGlycemiaEntries(selectedDate);
  
  const { entries: foodEntries } = useFoodEntries(selectedDate);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [glucose, setGlucose] = useState('');
  const [measurementType, setMeasurementType] = useState<string>('fasting');
  const [notes, setNotes] = useState('');
  
  const [editingEntry, setEditingEntry] = useState<GlycemiaEntry | null>(null);
  const [editGlucose, setEditGlucose] = useState('');
  const [editType, setEditType] = useState('');

  const latestReading = getLatestReading();
  const averageToday = getAverageToday();
  
  // Calculate total carbs and fiber from food entries for glycemic prediction
  const carbsSummary = foodEntries.reduce((acc, entry) => ({
    carbs: acc.carbs + (entry.carbs || 0),
    fiber: acc.fiber + (entry.fiber || 0),
  }), { carbs: 0, fiber: 0 });
  
  const dailyGlycemicImpact = calculateGlycemicImpact(carbsSummary.carbs, carbsSummary.fiber);

  const handleSubmit = async () => {
    const glucoseValue = parseInt(glucose);
    if (isNaN(glucoseValue) || glucoseValue <= 0) return;
    
    try {
      await addGlycemiaEntry(glucoseValue, measurementType, notes || undefined);
      setShowForm(false);
      setGlucose('');
      setMeasurementType('fasting');
      setNotes('');
    } catch { /* silently fail */ }
  };

  const handleEdit = (entry: GlycemiaEntry) => {
    setEditingEntry(entry);
    setEditGlucose(entry.glucose_mg_dl.toString());
    setEditType(entry.measurement_type);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    const glucoseValue = parseInt(editGlucose);
    if (glucoseValue <= 0) return;
    
    try {
      await updateGlycemiaEntry(editingEntry.id, glucoseValue, editType);
      setEditingEntry(null);
    } catch { /* silently fail */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGlycemiaEntry(id);
    } catch { /* silently fail */ }
  };

  const getStatusInfo = () => {
    if (!latestReading) return null;
    return getGlycemiaStatus(latestReading.glucose_mg_dl, latestReading.measurement_type);
  };

  const statusInfo = getStatusInfo();

  return (
    <>
      <div className="space-y-2">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-card shadow-soft hover:shadow-card transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Activity className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Glicemia</p>
              <div className="flex items-center gap-2">
                {latestReading ? (
                  <>
                    <span className={`text-lg font-bold num-display ${statusInfo?.color || ''}`}>
                      {latestReading.glucose_mg_dl}
                    </span>
                    <span className="text-xs text-muted-foreground">mg/dL</span>
                    {statusInfo && (
                      <span className={`text-xs ${statusInfo.color}`}>
                        ({statusInfo.status})
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Sem medições</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{entries.length}</span>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={(e) => { e.stopPropagation(); setShowForm(true); }}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isExpanded && (
          <div className="space-y-2 animate-fade-in pl-2">
            {/* Daily carbs and glycemic impact prediction */}
            {foodEntries.length > 0 && (
              <div className={`p-3 rounded-xl ${dailyGlycemicImpact.bgColor} mb-3`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Previsão do dia</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dailyGlycemicImpact.bgColor} ${dailyGlycemicImpact.color}`}>
                    {dailyGlycemicImpact.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold">{Math.round(carbsSummary.carbs)}g</p>
                    <p className="text-xs text-muted-foreground">Carboidratos</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{Math.round(carbsSummary.fiber)}g</p>
                    <p className="text-xs text-muted-foreground">Fibras</p>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${dailyGlycemicImpact.color}`}>{dailyGlycemicImpact.carbsNet}g</p>
                    <p className="text-xs text-muted-foreground">Carbs líq.</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>Impacto estimado: {dailyGlycemicImpact.estimatedSpike}</span>
                </div>
                {(dailyGlycemicImpact.level === 'high' || dailyGlycemicImpact.level === 'very_high') && (
                  <div className="mt-2 flex items-center justify-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Atenção: consumo elevado de carboidratos</span>
                  </div>
                )}
              </div>
            )}
            
            {entries.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Nenhuma medição hoje
              </div>
            ) : (
              <>
                {averageToday > 0 && entries.length > 1 && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-center mb-2">
                    <p className="text-xs text-muted-foreground">Média do dia</p>
                    <p className="text-lg font-bold text-emerald-600">{averageToday} mg/dL</p>
                  </div>
                )}
                {entries.map((entry) => {
                  const status = getGlycemiaStatus(entry.glucose_mg_dl, entry.measurement_type);
                  return (
                    <div key={entry.id} className="entry-card">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                        <Activity className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${status.color}`}>{entry.glucose_mg_dl}</span>
                          <span className="text-xs text-muted-foreground">mg/dL</span>
                          <span className={`text-xs ${status.color}`}>• {status.status}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            {MEASUREMENT_TYPES[entry.measurement_type as keyof typeof MEASUREMENT_TYPES] || entry.measurement_type}
                          </span>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(entry.measured_at), 'HH:mm')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                          onClick={() => handleEdit(entry)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm rounded-3xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Registrar Glicemia
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Glicemia (mg/dL)</label>
              <Input 
                type="text"
                inputMode="numeric"
                value={glucose} 
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setGlucose(value);
                }} 
                placeholder="Ex: 95" 
                className="h-12 text-lg rounded-xl"
              />
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Tipo de medição</label>
              <Select value={measurementType} onValueChange={setMeasurementType}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEASUREMENT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {glucose && parseInt(glucose) > 0 && (
              <div className={`p-3 rounded-xl ${getGlycemiaStatus(parseInt(glucose), measurementType).color === 'text-green-500' ? 'bg-green-500/10' : getGlycemiaStatus(parseInt(glucose), measurementType).color === 'text-amber-500' ? 'bg-amber-500/10' : getGlycemiaStatus(parseInt(glucose), measurementType).color === 'text-red-500' ? 'bg-red-500/10' : 'bg-blue-500/10'} text-center`}>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className={`text-xl font-bold ${getGlycemiaStatus(parseInt(glucose), measurementType).color}`}>
                  {getGlycemiaStatus(parseInt(glucose), measurementType).status}
                </p>
              </div>
            )}

            <Button className="w-full h-12 rounded-xl" onClick={handleSubmit}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="max-w-sm rounded-3xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Medição
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Glicemia (mg/dL)</label>
              <Input 
                type="text"
                inputMode="numeric"
                value={editGlucose} 
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setEditGlucose(value);
                }} 
                placeholder="mg/dL" 
                className="h-12 text-lg rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Tipo de medição</label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEASUREMENT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setEditingEntry(null)}>
                Cancelar
              </Button>
              <Button className="flex-1 h-11 rounded-xl" onClick={handleSaveEdit}>
                <Check className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
