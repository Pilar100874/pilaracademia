import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Info, ChevronDown, ChevronRight } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { FormStep, ResourceField, FieldType, FIELD_TYPE_LABELS, FIELD_TYPE_CATEGORIES } from './types';
import { ResourceFieldEditor } from './ResourceFieldEditor';

interface FormStepsManagerProps {
  steps: FormStep[];
  fields: ResourceField[];
  onStepsChange: (steps: FormStep[]) => void;
  onFieldsChange: (fields: ResourceField[]) => void;
}

// Sortable field item component
const SortableFieldItem: React.FC<{
  field: ResourceField;
  allFields: ResourceField[];
  onUpdate: (field: ResourceField) => void;
  onRemove: () => void;
}> = ({ field, allFields, onUpdate, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <ResourceFieldEditor
        field={field}
        allFields={allFields}
        onChange={onUpdate}
        onRemove={onRemove}
      />
    </div>
  );
};

export const FormStepsManager: React.FC<FormStepsManagerProps> = ({
  steps,
  fields,
  onStepsChange,
  onFieldsChange,
}) => {
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleAddStep = () => {
    const newStep: FormStep = {
      id: crypto.randomUUID(),
      number: steps.length + 1,
      title: `Etapa ${steps.length + 1}`,
      description: '',
    };
    onStepsChange([...steps, newStep]);
    setOpenSteps(prev => ({ ...prev, [newStep.id]: true }));
  };

  const handleUpdateStep = (index: number, updates: Partial<FormStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    onStepsChange(newSteps);
  };

  const handleRemoveStep = (index: number) => {
    const stepToRemove = steps[index];
    const newFields = fields.filter(f => f.stepId !== stepToRemove.id);
    onFieldsChange(newFields);
    
    const newSteps = steps.filter((_, i) => i !== index).map((step, i) => ({
      ...step,
      number: i + 1,
    }));
    onStepsChange(newSteps);
  };

  const handleAddFieldToStep = (stepId: string, type: FieldType) => {
    const newField: ResourceField = {
      id: crypto.randomUUID(),
      name: '',
      label: FIELD_TYPE_LABELS[type],
      type,
      required: false,
      stepId,
    };
    onFieldsChange([...fields, newField]);
  };

  const handleUpdateField = (fieldId: string, updatedField: ResourceField) => {
    onFieldsChange(fields.map(f => f.id === fieldId ? updatedField : f));
  };

  const handleRemoveField = (fieldId: string) => {
    onFieldsChange(fields.filter(f => f.id !== fieldId));
  };

  const getFieldsForStep = (stepId: string) => {
    return fields.filter((f) => f.stepId === stepId);
  };

  const toggleStep = (stepId: string) => {
    setOpenSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent, stepId: string) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const stepFields = getFieldsForStep(stepId);
    const oldIndex = stepFields.findIndex(f => f.id === active.id);
    const newIndex = stepFields.findIndex(f => f.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedStepFields = arrayMove(stepFields, oldIndex, newIndex);
      const otherFields = fields.filter(f => f.stepId !== stepId);
      onFieldsChange([...otherFields, ...reorderedStepFields]);
    }
  };

  const activeField = activeId ? fields.find(f => f.id === activeId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h4 className="font-medium text-sm">Etapas do Formulário</h4>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddStep}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Etapa
        </Button>
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
          <Info className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">Nenhuma etapa configurada</p>
          <p className="text-xs mt-1">
            Adicione etapas para organizar o formulário em seções
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => {
            const stepFields = getFieldsForStep(step.id);
            const isOpen = openSteps[step.id] ?? false;
            
            return (
              <Collapsible key={step.id} open={isOpen} onOpenChange={() => toggleStep(step.id)}>
                <Card className="border-primary/20">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 cursor-move">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary" className="h-6 w-6 p-0 flex items-center justify-center rounded-full">
                          {step.number}
                        </Badge>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input
                          value={step.title}
                          onChange={(e) => handleUpdateStep(index, { title: e.target.value })}
                          placeholder="Título da etapa"
                          className="h-8 font-medium"
                        />
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveStep(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CollapsibleContent>
                    <CardContent className="py-3 px-4 pt-0 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Texto informativo (exibido no início da etapa)
                        </Label>
                        <Textarea
                          value={step.description || ''}
                          onChange={(e) => handleUpdateStep(index, { description: e.target.value })}
                          placeholder="Ex: Nesta etapa, você irá fornecer as informações básicas do produto..."
                          rows={2}
                          className="resize-none text-sm"
                        />
                      </div>

                      {/* Fields in this step with drag and drop */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">
                            Campos desta etapa ({stepFields.length})
                          </Label>
                          
                          {/* Modern dropdown for adding fields */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                                <Plus className="h-3.5 w-3.5" />
                                Campo
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {Object.entries(FIELD_TYPE_CATEGORIES).map(([categoryKey, category]) => (
                                <DropdownMenuSub key={categoryKey}>
                                  <DropdownMenuSubTrigger className="text-sm">
                                    {category.label}
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="w-48">
                                    {category.types.map((type) => (
                                      <DropdownMenuItem
                                        key={type}
                                        onClick={() => handleAddFieldToStep(step.id, type)}
                                        className="text-sm"
                                      >
                                        {FIELD_TYPE_LABELS[type]}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {stepFields.length > 0 ? (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={(e) => handleDragEnd(e, step.id)}
                          >
                            <SortableContext
                              items={stepFields.map(f => f.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2 pl-8 border-l-2 border-primary/20">
                                {stepFields.map((field) => (
                                  <SortableFieldItem
                                    key={field.id}
                                    field={field}
                                    allFields={fields}
                                    onUpdate={(updated) => handleUpdateField(field.id, updated)}
                                    onRemove={() => handleRemoveField(field.id)}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                            <DragOverlay>
                              {activeField ? (
                                <div className="bg-background border rounded-lg p-2 shadow-lg opacity-90">
                                  <Badge variant="secondary" className="text-xs">
                                    {FIELD_TYPE_LABELS[activeField.type]}
                                  </Badge>
                                  <span className="ml-2 text-sm">{activeField.label || 'Campo sem nome'}</span>
                                </div>
                              ) : null}
                            </DragOverlay>
                          </DndContext>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg bg-muted/10">
                            <p className="text-xs">Nenhum campo adicionado</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
};
