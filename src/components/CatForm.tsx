import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { computeCatAge } from '~/lib/catAge'
import { checkIsCat, type Prediction } from '~/lib/catCheck'
import { celebrate } from '~/lib/confetti'
import { useI18n } from '~/lib/i18n'
import { validateImage } from '~/lib/image'
import { rememberOwnership, getOwnerToken, getOwnerName } from '~/lib/tokens'
import {
  COAT_OPTIONS,
  MAX_PHOTOS,
  type CatDTO,
  type CoatId,
} from '~/lib/types'
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

type PhotoItem = { id: string; url: string; file?: File }

function initialPhotos(initial?: CatDTO): PhotoItem[] {
  const urls =
    initial?.photos && initial.photos.length > 0
      ? initial.photos
      : initial?.photoUrl
        ? [initial.photoUrl]
        : []
  return urls.map((url) => ({ id: crypto.randomUUID(), url }))
}

export function CatForm({ mode, initial, token }: CatFormProps) {
  const i18n = useI18n()
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const checkId = useRef(0)

  const [photos, setPhotos] = useState<PhotoItem[]>(() => initialPhotos(initial))
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
  const cover = photos[0]?.url ?? ''

  function runChecks(items: PhotoItem[]) {
    const id = ++checkId.current
    setAiStatus('checking')
    setAiReview(null)
    void (async () => {
      for (const item of items) {
        if (!item.file) continue
        const result = await checkIsCat(item.file)
        if (id !== checkId.current) return
        setAiReview(result.predictions ?? null)
        if (result.status === 'not-cat') {
          // Drop the offending photo and tell the user why.
          URL.revokeObjectURL(item.url)
          setPhotos((prev) => prev.filter((p) => p.id !== item.id))
          setAiStatus('not-cat')
          setError(i18n.form.aiNotCat)
          return
        }
      }
      if (id === checkId.current) setAiStatus('ok')
    })()
  }

  function chooseFiles(list: FileList | null) {
    const picked = Array.from(list ?? [])
    if (picked.length === 0) return

    const accepted: PhotoItem[] = []
    let problem: string | null = null
    for (const file of picked) {
      const invalid = validateImage(file)
      if (invalid) {
        problem = i18n.errorMessage(invalid)
        continue
      }
      accepted.push({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        file,
      })
    }

    const room = MAX_PHOTOS - photos.length
    const take = accepted.slice(0, Math.max(0, room))
    if (accepted.length > take.length) problem = i18n.form.errTooManyPhotos
    setError(problem)
    if (take.length === 0) return

    setPhotos((prev) => [...prev, ...take])
    runChecks(take)
  }

  function removePhoto(id: string) {
    const item = photos.find((p) => p.id === id)
    if (item?.file) URL.revokeObjectURL(item.url)
    setPhotos((prev) => prev.filter((p) => p.id !== id))
    checkId.current += 1
    setAiStatus('idle')
    setAiReview(null)
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return

    if (photos.length === 0) {
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
    if (aiStatus === 'checking') {
      setError(i18n.form.aiChecking)
      return
    }
    if (aiStatus === 'not-cat') {
      setError(i18n.form.aiNotCat)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const uploaded: string[] = []
      for (const item of photos) {
        uploaded.push(item.file ? await uploadPhoto(item.file) : item.url)
      }

      const payload = {
        name: name.trim(),
        birthdate,
        photos: uploaded,
        bio: bio.trim() || undefined,
        coat,
      }

      if (mode === 'create') {
        const { cat, token: newToken } = await createCatFn({
          data: {
            ...payload,
            ownerToken: getOwnerToken(),
            ownerName: getOwnerName() || undefined,
          },
        })
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
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              chooseFiles(e.dataTransfer.files)
            }}
            className={cn(
              'rounded-[26px] border-2 border-dashed bg-cream/40 p-3 transition-colors',
              dragging ? 'border-tangerine bg-tangerine/10' : 'border-ink/50',
            )}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((item, i) => (
                <div
                  key={item.id}
                  className="relative overflow-hidden rounded-[18px] border-2 border-ink bg-cream"
                >
                  <img
                    src={item.url}
                    alt={i18n.form.previewAlt}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  {i === 0 ? (
                    <span className="absolute left-2 top-2 rounded-full border-2 border-ink bg-butter px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                      {i18n.form.cover}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removePhoto(item.id)}
                    aria-label={i18n.form.removePhoto}
                    className="absolute right-2 top-2 grid size-8 place-items-center rounded-full border-2 border-ink bg-paper shadow-sticker-sm"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              ))}

              {photos.length < MAX_PHOTOS ? (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-ink/50 bg-paper/60 text-center transition-colors hover:border-ink hover:bg-paper"
                >
                  <span className="grid size-11 place-items-center rounded-2xl border-2 border-ink bg-butter shadow-sticker-sm">
                    <ImagePlus className="size-5" aria-hidden />
                  </span>
                  <span className="px-2 text-xs font-bold text-ink-soft">
                    {i18n.form.addPhoto}
                  </span>
                </button>
              ) : null}
            </div>

            {photos.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm font-medium text-ink-soft">
                {i18n.form.drop} — {i18n.form.dropOr}
              </p>
            ) : null}

            {photos.length >= MAX_PHOTOS ? (
              <p className="mt-3 text-center text-xs font-bold text-ink-soft">
                {i18n.form.maxPhotos(MAX_PHOTOS)}
              </p>
            ) : null}

            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                chooseFiles(e.target.files)
                e.target.value = ''
              }}
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
            {cover ? (
              <img
                src={cover}
                alt=""
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="grid aspect-[4/3] place-items-center text-5xl">
                🐱
              </div>
            )}
          </div>
          {photos.length > 1 ? (
            <p className="mt-2 text-center text-xs font-bold text-ink-soft">
              {i18n.detail.photoOf(1, photos.length)}
            </p>
          ) : null}
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
