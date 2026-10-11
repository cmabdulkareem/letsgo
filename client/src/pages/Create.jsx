import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, ChevronRight, Check, Plus, X } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Button, Input, Select, Textarea } from '../components/ui';
import { CategoryIcon } from '../components/CategoryIcon';

const schema = z.object({
  title: z.string().trim().min(4, 'Give it a title (4+ characters)').max(100),
  description: z.string().trim().min(10, 'Describe it (10+ characters)').max(3000),
  category: z.string().min(1, 'Pick a category'),
  visibility: z.enum(['public', 'private']),
  joinPolicy: z.enum(['open', 'approval']),
  locationName: z.string().trim().min(2, 'Add a venue or meeting point').max(120),
  city: z.string().trim().max(80),
  area: z.string().trim().max(80),
  confirmedStartAt: z.string().optional(),
  decideLater: z.boolean(),
  minimumParticipants: z.coerce.number().int().min(2).max(500),
  maximumParticipants: z.coerce.number().int().min(2).max(500),
  skillLevel: z.enum(['any', 'beginner', 'intermediate', 'advanced']),
  isFree: z.boolean(),
  amount: z.coerce.number().min(0),
  currency: z.string().length(3),
  durationMinutes: z.coerce.number().int().min(15).max(1440),
  roomRules: z.string().max(1500).optional().default(''),
  cancellationPolicy: z.string().max(1000).optional().default(''),
  equipment: z.array(z.string().trim().min(1).max(80)).default([]),
});

const STEPS = ['Basics', 'Where & when', 'Who can join', 'Extras'];

export default function Create() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [equipmentDraft, setEquipmentDraft] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data.data,
    staleTime: 5 * 60_000,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      visibility: 'public',
      joinPolicy: 'open',
      city: '',
      area: '',
      decideLater: true,
      minimumParticipants: 2,
      maximumParticipants: 10,
      skillLevel: 'any',
      isFree: true,
      amount: 0,
      currency: 'INR',
      durationMinutes: 120,
      equipment: [],
      roomRules: '',
      cancellationPolicy: '',
    },
  });

  const decideLater = watch('decideLater');
  const isFree = watch('isFree');
  const categoryId = watch('category');
  const equipment = watch('equipment');
  const selectedCategory = useMemo(() => categories?.find((c) => String(c._id) === categoryId), [categories, categoryId]);

  const stepFields = [
    ['title', 'description', 'category'],
    ['locationName', 'city', 'area'],
    ['minimumParticipants', 'maximumParticipants'],
    [],
  ];

  const next = async () => {
    const ok = await trigger(stepFields[step]);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const addEquipment = () => {
    const item = equipmentDraft.trim();
    if (!item) return;
    if (equipment.length >= 20) return;
    setValue('equipment', [...equipment, item], { shouldDirty: true });
    setEquipmentDraft('');
  };

  const createMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        title: values.title,
        description: values.description,
        category: values.category,
        visibility: values.visibility,
        joinPolicy: values.joinPolicy,
        location: { name: values.locationName, city: values.city, area: values.area },
        confirmedStartAt: values.decideLater ? null : values.confirmedStartAt || null,
        confirmedEndAt: null,
        minimumParticipants: values.minimumParticipants,
        maximumParticipants: values.maximumParticipants,
        skillLevel: values.skillLevel,
        cost: { isFree: values.isFree, amount: values.isFree ? 0 : values.amount, currency: values.currency, notes: '' },
        equipment: values.equipment,
        durationMinutes: values.durationMinutes,
        roomRules: values.roomRules,
        cancellationPolicy: values.cancellationPolicy,
        waitlistEnabled: true,
        attendanceConfirmationRequired: true,
      };
      return (await api.post('/activities', payload)).data.data;
    },
    onSuccess: (room) => {
      showToast('Activity created — now build your crew', 'success');
      navigate(`/rooms/${room._id}?tab=schedule`);
    },
    onError: (err) => showToast(errorMessage(err, 'Could not create the activity'), 'error'),
  });

  const onSubmit = (values) => createMutation.mutate(values);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-extrabold text-ink">Create an activity</h1>
      <p className="text-sm text-ink-soft mt-0.5">You don&rsquo;t need a group yet — members will find you.</p>

      {/* Stepper */}
      <ol className="flex items-center gap-2 mt-5" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2 flex-1">
            <span
              className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                i < step ? 'bg-primary text-white' : i === step ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-border/60 text-ink-soft'
              }`}
            >
              {i < step ? <Check size={13} /> : i + 1}
            </span>
            <span className={`text-xs font-semibold hidden sm:block ${i === step ? 'text-ink' : 'text-ink-soft'}`}>{label}</span>
            {i < STEPS.length - 1 && <span className="flex-1 h-px bg-border" aria-hidden />}
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-5 mt-5 space-y-4" noValidate>
        {step === 0 && (
          <>
            <Input label="Title" placeholder="Sunday morning cricket at Central Maidan" error={errors.title?.message} {...register('title')} />
            <Textarea
              label="Description"
              placeholder="What is it, who is it for, what should people expect?"
              error={errors.description?.message}
              {...register('description')}
            />
            <div>
              <span className="label">Category</span>
              {errors.category && <p className="text-xs text-red-500 mb-2">{errors.category.message}</p>}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(categories || []).map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => setValue('category', String(c._id), { shouldValidate: true })}
                    aria-pressed={categoryId === String(c._id)}
                    className={`card !shadow-none p-2 flex flex-col items-center gap-1.5 transition ${
                      categoryId === String(c._id) ? 'border-primary ring-2 ring-primary/25' : 'hover:border-primary/50'
                    }`}
                  >
                    <CategoryIcon category={c} size={36} iconSize={18} />
                    <span className="text-[10px] font-semibold text-ink-soft text-center leading-tight">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Input label="Venue / meeting point" placeholder="Central Maidan, near the pavilion" error={errors.locationName?.message} {...register('locationName')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Area" placeholder="Kasaragod" error={errors.area?.message} {...register('area')} />
              <Input label="City" placeholder="Kasaragod" error={errors.city?.message} {...register('city')} />
            </div>
            <div className="rounded-xl border border-border p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-primary"
                  checked={decideLater}
                  onChange={(e) => setValue('decideLater', e.target.checked)}
                />
                <span className="text-sm font-semibold text-ink">Let members vote on the date</span>
              </label>
              {!decideLater && (
                <Input
                  label="Confirmed start"
                  type="datetime-local"
                  error={errors.confirmedStartAt?.message}
                  {...register('confirmedStartAt', {
                    validate: (v) => (watch('decideLater') ? true : v ? true : 'Pick a date or turn voting on'),
                  })}
                />
              )}
              <p className="text-xs text-ink-soft">
                {decideLater
                  ? 'You can propose options later and members will vote. Great when you don’t know everyone’s schedule yet.'
                  : 'Members will see this as the confirmed time.'}
              </p>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Min participants"
                type="number"
                min={2}
                error={errors.minimumParticipants?.message}
                {...register('minimumParticipants', { valueAsNumber: true })}
              />
              <Input
                label="Max participants"
                type="number"
                min={2}
                error={errors.maximumParticipants?.message}
                {...register('maximumParticipants', { valueAsNumber: true })}
              />
            </div>
            {errors.maximumParticipants?.type === 'too_small' && null}
            <Select label="Skill level" {...register('skillLevel')}>
              <option value="any">Any</option>
              <option value="beginner">Beginner friendly</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
            <div className="grid sm:grid-cols-2 gap-3">
              <Select label="Who can find it" {...register('visibility')}>
                <option value="public">Public — anyone can discover it</option>
                <option value="private">Private — invite only</option>
              </Select>
              <Select label="Joining" {...register('joinPolicy')}>
                <option value="open">Open — join instantly</option>
                <option value="approval">Approval — you review requests</option>
              </Select>
            </div>
            <p className="text-xs text-ink-soft">
              Private rooms never appear in discovery — sharing the link alone won&rsquo;t grant access.
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <div className="rounded-xl border border-border p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-primary" checked={isFree} onChange={(e) => setValue('isFree', e.target.checked)} />
                <span className="text-sm font-semibold text-ink">Free to join</span>
              </label>
              {!isFree && (
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Amount per person" type="number" min={0} {...register('amount', { valueAsNumber: true })} />
                  <Select label="Currency" {...register('currency')}>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </Select>
                </div>
              )}
            </div>
            <Input
              label="Duration (minutes)"
              type="number"
              min={15}
              max={1440}
              {...register('durationMinutes', { valueAsNumber: true })}
            />
            <div>
              <span className="label">Equipment / things to bring</span>
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="e.g. Water bottle"
                  value={equipmentDraft}
                  onChange={(e) => setEquipmentDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addEquipment();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={addEquipment} aria-label="Add item">
                  <Plus size={16} />
                </Button>
              </div>
              {equipment.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {equipment.map((item) => (
                    <span key={item} className="chip bg-border/50 text-ink">
                      {item}
                      <button
                        type="button"
                        aria-label={`Remove ${item}`}
                        onClick={() => setValue('equipment', equipment.filter((e) => e !== item))}
                        className="ml-1 text-ink-soft hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Textarea label="House rules (optional)" placeholder="Be on time, respect equipment…" {...register('roomRules')} />
            <Textarea label="Cancellation policy (optional)" {...register('cancellationPolicy')} />
          </>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft size={16} /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>
              Next <ChevronRight size={16} />
            </Button>
          ) : (
            <Button type="submit" loading={createMutation.isPending}>
              Create activity
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
