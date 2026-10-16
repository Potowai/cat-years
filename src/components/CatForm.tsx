import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { computeCatAge } from '~/lib/catAge'
import { checkIsCat, type Prediction } from '~/lib/catCheck'
import { celebrate } from '~/lib/confetti'
import { useI18n } from '~/lib/i18n'
import { validateImage } from '~/lib/image'
import { rememberOwnership } from '~/lib/tokens'
import { COAT_OPTIONS, type CatDTO, type CoatId } from '~/lib/types'
import { cn } from '~/lib/utils'
import { uploadPhoto } from '~/lib/upload'
import { createCatFn, updateCatFn } from '~/server/cats.functions'
import { Button, Chip, Input, Label, Textarea } from './ui'

type CatFormProps = {
  mode: 'create' | 'edit'
  initial?: CatDTO
  token?: string
}

type AiStatus = 'idle' | 'checking' | 'ok' | 'not-cat' | 'error'

export function CatForm({ mode, initial, token }: CatFormProps) {
  const i18n = useI18n()
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const checkId = useRef(0)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState(initial?.photoUrl ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [birthdate, setBirthdate] = useState(initial?.birthdate ?? '')
  const [coat, setCoat] = useState<CoatId | undefined>(
    (initial?.coat as CoatId | null) ?? undefined,
  )
  const [bio, setBio] = useState(initial?.bio ?? '')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle')
  const [aiReview, setAiReview] = useState<Prediction[] | null>(null)

  const age = birthdate ? computeCatAge(birthdate) : null
  const today = new Date().toISOString().slice(0, 10)

  function chooseFile(list: FileList | null) {
    const picked = list?.[0]
    if (!picked) return
    const problem = validateImage(picked)
    if (problem) {
      setError(i18n.errorMessage(problem))
      return
    }
    setError(null)
    setFile(picked)
    setPreview(URL.createObjectURL(picked))

    const id = ++checkId.current
    setAiStatus('checking')
    setAiReview(null)
    void checkIsCat(picked).then((result) => {
      if (id !== checkId.current) return
      setAiReview(result.predictions ?? null)
      if (result.status === 'ok') {
        setAiStatus('ok')
        setError(null)
      } else if (result.status === 'not-cat') {
        setAiStatus('not-cat')
        setError(i18n.form.aiNotCat)
      } else {
        setAiStatus('error')
      }
    })
  }

  function clearFile() {
    checkId.current += 1
    setFile(null)
    setPreview('')
    setAiStatus('idle')
    setAiReview(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return

    if (!preview && !file) {
      setError(i18n.form.errPhotoMissing)
      return
    }
    if (!name.trim()) {
      setError(i18n.form.errNameMissing)
      return
    }
    if (!birthdate) {
      setError(i18n.form.errBirthdayMissing)
      return
    }
    if (birthdate > today) {
      setError(i18n.form.errFuture)
      return
    }
    if (file && aiStatus === 'checking') {
      setError(i18n.form.aiChecking)
      return
    }
    if (file && aiStatus === 'not-cat') {
      setError(i18n.form.aiNotCat)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      let photoUrl = initial?.photoUrl ?? ''
      if (file) {
        photoUrl = await uploadPhoto(file)
      }

      const payload = {
        name: name.trim(),
        birthdate,
        photoUrl,
        bio: bio.trim() || undefined,
        coat,
      }

      if (mode === 'create') {
        const { cat, token: newToken } = await createCatFn({ data: payload })
        rememberOwnership(cat.id, newToken)
        void celebrate()
        await navigate({
          to: '/cats/$catSlug',
          params: { catSlug: cat.slug },
        })
      } else if (initial && token) {
        await updateCatFn({ data: { ...payload, slug: initial.slug, token } })
        await navigate({
          to: '/cats/$catSlug',
          params: { catSlug: initial.slug },
        })
      }
    } catch (err) {
      setError(
        i18n.errorMessage(err instanceof Error ? err.message : undefined),
      )
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-start"
    >
      <div className="space-y-6">
        <div>
          <Label hint={i18n.form.photoHint}>{i18n.form.photo}</Label>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileInput.current?.click()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              chooseFile(e.dataTransfer.files)
            }}
            className={cn(
              'relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-[26px] border-2 border-dashed bg-cream/40 transition-colors',
              dragging ? 'border-tangerine bg-tangerine/10' : 'border-ink/50',
            )}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt={i18n.form.previewAlt}
                  className="size-full object-cover"
                />
                <span className="absolute bottom-3 left-3 rounded-full border-2 border-ink bg-paper px-3 py-1 text-xs font-bold shadow-sticker-sm">
                  {i18n.form.tapChange}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearFile()
                  }}
                  aria-label={i18n.form.removePhoto}
                  className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border-2 border-ink bg-paper shadow-sticker-sm"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <span className="grid size-16 place-items-center rounded-2xl border-2 border-ink bg-butter shadow-sticker-sm">
                  <ImagePlus className="size-7" aria-hidden />
                </span>
                <span className="font-bold">{i18n.form.drop}</span>
                <span className="text-sm font-medium text-ink-soft">
                  {i18n.form.dropOr}
                </span>
              </div>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => chooseFile(e.target.files)}
            />
          </div>
          {aiStatus === 'checking' ||
          aiStatus === 'ok' ||
          aiStatus === 'not-cat' ? (
            <p
              role="status"
              className={cn(
                'mt-2 text-sm font-bold',
                aiStatus === 'ok'
                  ? 'text-sage'
                  : aiStatus === 'not-cat'
                    ? 'text-tangerine'
                    : 'text-ink-soft',
              )}
            >
              {aiStatus === 'checking'
                ? i18n.form.aiChecking
                : aiStatus === 'ok'
                  ? i18n.form.aiCatOk
                  : i18n.form.aiNotCat}
            </p>
          ) : null}
          {import.meta.env.DEV && aiReview ? (
            <details className="mt-2 rounded-xl border-2 border-dashed border-ink/40 bg-paper px-3 py-2 text-xs">
              <summary className="cursor-pointer font-bold">
                AI review (dev only)
              </summary>
              <ul className="mt-2 space-y-1">
                {aiReview.map((p) => (
                  <li
                    key={p.className}
                    className="flex justify-between gap-3 font-medium"
                  >
                    <span className="truncate">{p.className}</span>
                    <span className="tabular-nums">
                      {(p.probability * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>

        <div>
          <Label htmlFor="cat-name">{i18n.form.name}</Label>
          <Input
            id="cat-name"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder={i18n.form.namePlaceholder}
          />
        </div>

        <div>
          <Label htmlFor="cat-birthdate" hint={i18n.form.birthdayHint}>
            {i18n.form.birthday}
          </Label>
          <Input
            id="cat-birthdate"
            type="date"
            value={birthdate}
            max={today}
            min="1990-01-01"
            onChange={(e) => setBirthdate(e.target.value)}
          />
        </div>

        <div>
          <Label hint={i18n.form.coatOptional}>{i18n.form.coat}</Label>
          <div className="flex flex-wrap gap-2.5">
            {COAT_OPTIONS.map((option) => {
              const active = coat === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCoat(active ? undefined : option.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-full border-2 border-ink px-3 py-1.5 text-sm font-bold transition-transform',
                    active
                      ? 'bg-butter shadow-sticker-sm'
                      : 'bg-paper opacity-80 hover:-translate-y-0.5 hover:opacity-100',
                  )}
                >
                  <span
                    className="size-4 rounded-full border-2 border-ink"
                    style={{ backgroundColor: option.hex }}
                    aria-hidden
                  />
                  {i18n.form.coats[option.id]}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="cat-bio" hint={`${bio.length}/280`}>
            {i18n.form.bio}
          </Label>
          <Textarea
            id="cat-bio"
            rows={3}
            maxLength={280}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={i18n.form.bioPlaceholder}
          />
        </div>
      </div>

      <aside className="lg:sticky lg:top-24">
        <div className="rounded-[28px] border-2 border-ink bg-paper p-4 shadow-sticker">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-ink-soft">
            {i18n.form.livePreview}
          </p>
          <div className="overflow-hidden rounded-[20px] border-2 border-ink bg-cream">
            {preview ? (
              <img
                src={preview}
                alt=""
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="grid aspect-[4/3] place-items-center text-5xl">
                🐱
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="truncate font-display text-3xl font-black">
              {name.trim() || i18n.form.yourCat}
            </span>
            {age ? (
              <Chip tone={i18n.stageAccent(age.stageId)}>
                {i18n.stageEmoji(age.stageId)} {i18n.stageLabel(age.stageId)}
              </Chip>
            ) : null}
          </div>
          <div className="mt-3 rounded-2xl border-2 border-ink bg-ink px-4 py-3 text-paper">
            {age ? (
              <>
                <div className="flex items-end gap-2">
                  <span className="font-display text-5xl font-black leading-none text-butter">
                    {i18n.humanAgeLabel(age)}
                  </span>
                  <span className="pb-1 text-sm font-bold text-cream/85">
                    {i18n.form.humanYearsOld}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-cream/75">
                  {i18n.form.inCatTime(i18n.catAgeLabel(age))}
                </p>
              </>
            ) : (
              <p className="py-2 text-sm font-semibold text-cream/75">
                {i18n.form.pickBirthday}
              </p>
            )}
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border-2 border-ink bg-blush px-4 py-3 text-sm font-bold shadow-sticker-sm"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={submitting || aiStatus === 'checking'}
          className="mt-4 w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden />
              {mode === 'create' ? i18n.form.submitting : i18n.form.saving}
            </>
          ) : (
            <>
              {mode === 'create' ? i18n.form.submitCreate : i18n.form.submitEdit}
            </>
          )}
        </Button>
      </aside>
    </form>
  )
}
