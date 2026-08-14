'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  BarChart2,
  Globe,
  LogOut,
  MapPin,
} from 'lucide-react'
import { UserMenu } from './auth/UserMenu'

type CountryId = 'usa' | 'canada'
type LanguageCode = 'en' | 'fr'
type ComfortLevel = 'easy' | 'medium' | 'hard'

export type ErrandsSelection = {
  country: CountryId
  language: LanguageCode
  comfort: ComfortLevel
}

type ErrandsProps = {
  onStart: (selection: ErrandsSelection) => void
}

type Country = {
  id: CountryId
  name: string
  city: string
  blurb: string
  language: string
  languageLabel: string
  native: string
  coverImage: string
  taskCount: number
}

const MOCK_COUNTRIES: Country[] = [
  {
    id: 'usa',
    name: 'United States',
    city: 'New York City',
    blurb: 'Navigate the bustling streets of NYC.',
    language: 'en-US',
    languageLabel: 'English (US)',
    native: 'USA',
    coverImage:
      'https://placehold.co/600x400/1e3a8a/FFF?text=USA',
    taskCount: 2,
  },
  {
    id: 'canada',
    name: 'Canada',
    city: 'Toronto',
    blurb: 'Experience the polite and diverse culture.',
    language: 'en-CA',
    languageLabel: 'English (CA)',
    native: 'Canada',
    coverImage:
      'https://placehold.co/600x400/b91c1c/FFF?text=Canada',
    taskCount: 2,
  },
]

const BASE_LANG_OPTIONS = [
  {
    code: 'en' as LanguageCode,
    label: 'English',
    native: 'English',
  },
  {
    code: 'fr' as LanguageCode,
    label: 'French',
    native: 'Français',
  },
]

const COMFORT_OPTIONS = [
  {
    value: 'easy' as ComfortLevel,
    title: 'Easy',
    description: "I'm new to this language",
  },
  {
    value: 'medium' as ComfortLevel,
    title: 'Medium',
    description: 'I know some phrases',
  },
  {
    value: 'hard' as ComfortLevel,
    title: 'Hard',
    description: 'I can hold a basic conversation',
  },
]

const gloss = (text: string, lang: LanguageCode) => {
  if (lang === 'fr') {
    return `[FR Translation] ${text}`
  }

  return text
}

function Button({
  children,
  className = '',
  disabled = false,
  onClick,
  size = 'default',
  variant = 'default',
}: {
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
  size?: 'default' | 'lg'
  variant?: 'default' | 'subtle'
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center rounded-md font-medium
        transition-colors
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-yellow-400
        focus-visible:ring-offset-2
        disabled:pointer-events-none
        disabled:opacity-50

        ${size === 'lg'
          ? 'h-11 px-8 text-lg'
          : 'h-10 px-4 py-2'
        }

        ${variant === 'subtle'
          ? 'hover:bg-gray-100 hover:text-gray-900'
          : 'bg-yellow-400 text-black hover:bg-yellow-500 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
        }

        ${className}
      `}
    >
      {children}
    </button>
  )
}

function Badge({
  children,
  variant = 'default',
  className = '',
}: {
  children: React.ReactNode
  variant?: 'default' | 'neutral'
  className?: string
}) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full
        border-2 border-black
        px-2.5 py-0.5
        text-xs font-semibold

        ${variant === 'neutral'
          ? 'border-transparent bg-gray-100 text-gray-900'
          : 'bg-white text-black'
        }

        ${className}
      `}
    >
      {children}
    </span>
  )
}

function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`
        rounded-xl
        border-2 border-black
        bg-white
        text-gray-950
        shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
        ${className}
      `}
    >
      {children}
    </div>
  )
}

function CardContent({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  )
}

function StepHeader({
  n,
  title,
  hint,
}: {
  n: number
  title: string
  hint?: string
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
      <span
        className="
          flex h-10 w-10 shrink-0 items-center justify-center
          rounded-lg
          border-2 border-black
          bg-yellow-400
          text-lg font-black
          shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
        "
      >
        {n}
      </span>

      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight">
          {title}
        </h2>

        {hint && (
          <p className="text-sm font-medium text-gray-500">
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}

export default function Errands({
  onStart,
}: ErrandsProps) {
  const [summaries, setSummaries] = useState<Country[]>([])
  const [listLoading, setListLoading] = useState(true)

  const [pickedId, setPickedId] =
    useState<CountryId | undefined>(undefined)

  const [picked, setPicked] =
    useState<Country | null>(null)

  const [comfort, setComfort] =
    useState<ComfortLevel>('medium')

  const [baseLang, setBaseLang] =
    useState<LanguageCode>('en')

  /*
   * Simulate initial country fetch
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSummaries(MOCK_COUNTRIES)

      setPickedId(MOCK_COUNTRIES[0].id)

      setListLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  /*
   * Update selected country details
   */
  useEffect(() => {
    if (!pickedId) {
      setPicked(null)
      return
    }

    const found = MOCK_COUNTRIES.find(
      (country) => country.id === pickedId
    )

    setPicked(found || null)
  }, [pickedId])

  const pickedSummary = summaries.find(
    (country) => country.id === pickedId
  )

  const pickedComfort = COMFORT_OPTIONS.find(
    (option) => option.value === comfort
  )

  const ready = Boolean(
    pickedId &&
    picked &&
    baseLang &&
    comfort
  )

  /*
   * IMPORTANT:
   *
   * When the user clicks Start,
   * all selected options are sent
   * to page.tsx through onStart().
   */
  const enter = useCallback(() => {
    if (!pickedId || !pickedSummary) {
      return
    }

    const selection: ErrandsSelection = {
      country: pickedId,
      language: baseLang,
      comfort,
    }

    onStart(selection)
  }, [
    pickedId,
    pickedSummary,
    baseLang,
    comfort,
    onStart,
  ])

  if (listLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-4">
        <div className="animate-pulse text-xl font-bold tracking-tight">
          Loading countries...
        </div>
      </main>
    )
  }

  const enterLabel = `Enter ${pickedSummary?.city ?? 'country'
    }`

  return (
    <main
      className="
        relative min-h-screen
        max-h-full
        overflow-y-auto
        bg-[#f8fafc]
        font-sans
        text-slate-900
        selection:bg-yellow-200
      "
    >
      {/* Header */}
      <div className="sticky top-0 z-30 border-b-2 border-black bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
          <span className="flex items-center gap-2">
            <span className="text-xl font-black uppercase tracking-tighter">
              Fermes
            </span>
          </span>

          <div className="flex items-center gap-3">
            {/* <button
              type="button"
              className="
                inline-flex items-center gap-1
                rounded-md px-2 py-1
                text-sm font-bold
                transition-colors
                hover:bg-gray-100
              "
            >
              <BarChart2
                className="h-4 w-4"
                aria-hidden
              />

              Leaderboard
            </button> */}

            {/* <button
              type="button"
              className="
                inline-flex items-center gap-1
                rounded-md px-2 py-1
                text-sm font-bold
                transition-colors
                hover:bg-red-50
                hover:text-red-600
              "
            >
              <LogOut
                className="h-4 w-4"
                aria-hidden
              />

              Sign Out
            </button> */}
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Hero */}
      <header className="border-b-2 border-black bg-yellow-400 text-black">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:gap-10 sm:px-6 lg:px-8">
          <div
            className="
    flex h-24 w-24 shrink-0
    items-center justify-center
    rounded-xl
    border-2 border-black
    bg-white
    shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
    sm:h-32 sm:w-32
  "
          >
            <img
              src="/fermes.png"
              alt="Fermes logo"
              className="h-16 w-16 object-contain sm:h-24 sm:w-24"
            />
          </div>

          <div className="min-w-0">
            <h1
              className="
                text-4xl font-black
                uppercase
                leading-[0.95]
                tracking-tighter
                sm:text-5xl
                lg:text-6xl
              "
            >
              Fermes Errands
            </h1>

            <p className="mt-4 max-w-[52ch] text-lg font-medium leading-relaxed sm:text-xl">
              Turn a location into a farming decision — <br></br>
              check your soil, assess your crops, find nearby suppliers.
            </p>

            <ul className="mt-6 flex flex-wrap gap-3">
              <li>
                <Badge variant="neutral">
                  2 Countries
                </Badge>
              </li>

              <li>
                <Badge variant="neutral">
                  English & French Support
                </Badge>
              </li>

              <li>
                <Badge variant="neutral">
                  Voice Enabled
                </Badge>
              </li>
            </ul>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-10 sm:px-6 lg:px-8 lg:pb-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_24rem] lg:gap-12">

          {/* LEFT */}
          <div className="space-y-12">

            {/* Country */}
            <section aria-label="Choose a country">
              <StepHeader
                n={1}
                title="Choose your destination"
                hint="Each region has its own vibe."
              />

              <div
                className="grid grid-cols-1 gap-6 sm:grid-cols-2"
                role="radiogroup"
              >
                {summaries.map((country) => {
                  const selected =
                    country.id === pickedId

                  return (
                    <button
                      key={country.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className="
                        group cursor-pointer
                        rounded-xl text-left
                        focus-visible:outline-none
                        focus-visible:ring-4
                        focus-visible:ring-yellow-400
                        focus-visible:ring-offset-2
                      "
                      onClick={() =>
                        setPickedId(country.id)
                      }
                    >
                      <Card
                        className={`
                          relative aspect-[4/3]
                          overflow-hidden
                          transition-all duration-200

                          ${selected
                            ? '-translate-x-[-2px] -translate-y-2 ring-4 ring-yellow-400 ring-offset-2 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]'
                            : 'hover:-translate-x-[-1px] hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]'
                          }
                        `}
                      >
                        <img
                          src={country.coverImage}
                          alt=""
                          className="
                            absolute inset-0
                            h-full w-full
                            object-cover
                            transition-transform
                            duration-500
                            group-hover:scale-105
                          "
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                        {selected && (
                          <div className="absolute right-3 top-3 z-20 rotate-3">
                            <Badge className="bg-yellow-400 text-black">
                              Selected
                            </Badge>
                          </div>
                        )}

                        <CardContent className="absolute bottom-0 left-0 right-0 p-5 text-white">
                          <span className="block text-2xl font-black uppercase tracking-tight">
                            {country.native}
                          </span>

                          <span className="block text-sm font-bold opacity-90">
                            {country.city}
                          </span>

                          {/* <span className="mt-1 block text-xs font-medium uppercase tracking-widest opacity-75">
                            {country.languageLabel}
                          </span> */}
                        </CardContent>
                      </Card>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Language */}
            <section aria-label="Instruction language">
              <StepHeader
                n={2}
                title="I understand..."
                hint="Instructions appear in this language."
              />

              <div
                className="grid grid-cols-2 gap-4"
                role="radiogroup"
              >
                {BASE_LANG_OPTIONS.map((option) => {
                  const selected =
                    baseLang === option.code

                  return (
                    <button
                      key={option.code}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className="
                        cursor-pointer
                        rounded-xl
                        text-left
                        focus-visible:outline-none
                        focus-visible:ring-4
                        focus-visible:ring-yellow-400
                        focus-visible:ring-offset-2
                      "
                      onClick={() =>
                        setBaseLang(option.code)
                      }
                    >
                      <Card
                        className={`
                          h-full py-6 transition-all

                          ${selected
                            ? 'translate-x-1 -translate-y-1 bg-yellow-50 ring-2 ring-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'
                            : 'hover:translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                          }
                        `}
                      >
                        <CardContent className="flex flex-col items-center justify-center gap-2 text-center">
                          <span className="text-2xl font-black">
                            {option.native}
                          </span>

                          <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                            {option.label}
                          </span>
                        </CardContent>
                      </Card>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Comfort */}
            <section aria-label="Language comfort">
              <StepHeader
                n={3}
                title="Set your starting level"
                hint={`How much ${pickedSummary?.languageLabel ??
                  'of the language'
                  } do you already have?`}
              />

              <div
                className="
                  flex w-full max-w-2xl
                  overflow-hidden
                  rounded-xl
                  border-2 border-black
                  bg-white
                  shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
                "
                role="radiogroup"
              >
                {COMFORT_OPTIONS.map((option) => {
                  const selected =
                    comfort === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`
                        flex-1
                        border-r-2 border-black
                        px-3 py-4
                        font-bold
                        transition-colors
                        last:border-r-0
                        focus-visible:outline-none
                        focus-visible:bg-yellow-100

                        ${selected
                          ? 'bg-black text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                        }
                      `}
                      onClick={() =>
                        setComfort(option.value)
                      }
                    >
                      {option.title}
                    </button>
                  )
                })}
              </div>

              <p className="mt-4 max-w-[56ch] text-sm font-medium text-gray-600">
                <span className="font-bold text-black">
                  {pickedComfort?.description}.
                </span>{' '}
              </p>
            </section>
          </div>

          {/* RIGHT SUMMARY */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="overflow-hidden lg:max-h-[calc(100vh-8rem)]">

              {pickedSummary && (
                <div className="relative h-32 shrink-0 border-b-2 border-black">
                  <img
                    src={pickedSummary.coverImage}
                    alt=""
                    className="h-full w-full object-cover"
                  />

                  <div className="absolute inset-0 bg-black/40" />

                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <span className="block text-lg font-black uppercase">
                      {pickedSummary.native}
                    </span>

                    <span className="block text-sm font-bold opacity-90">
                      {pickedSummary.city}
                    </span>
                  </div>
                </div>
              )}

              <CardContent className="grid gap-5 p-6">

                {/* Selected badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge>
                    {pickedSummary?.languageLabel}
                  </Badge>

                  <Badge variant="neutral">
                    <span className="font-bold">
                      {baseLang === 'en' ? 'English' : 'French'}
                    </span>
                  </Badge>

                  <Badge variant="neutral">
                    {pickedComfort?.title}
                  </Badge>
                </div>

                <p className="text-sm leading-relaxed text-gray-600">
                  Explore your surroundings, understand land, and ask questions about what’s around you in{' '}
                  {pickedSummary?.languageLabel}.
                </p>

                {/* Phrases */}
                <div className="grid gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">
                    You will say things like
                  </h3>

                  <div className="space-y-2">
                    <div className="rounded border border-gray-200 bg-white px-3 py-2 shadow-sm">
                      <span className="block text-sm font-bold">
                        What crops can I grow here?
                      </span>

                      <em className="text-xs not-italic text-gray-500">
                        Quelles cultures puis-je faire pousser ici ?
                      </em>
                    </div>

                    <div className="rounded border border-gray-200 bg-white px-3 py-2 shadow-sm">
                      <span className="block text-sm font-bold">
                        What is the nearest seed dealer?
                      </span>

                      <em className="text-xs not-italic text-gray-500">
                        Où se trouve le vendeur de semences le plus proche ?
                      </em>
                    </div>
                  </div>
                </div>

                {/* Current selection */}
                {/* <div className="rounded-lg border-2 border-black bg-yellow-50 p-4">
                  <h3 className="text-xs font-black uppercase tracking-widest">
                    Your selection
                  </h3>

                  <div className="mt-3 grid gap-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-gray-500">
                        Country
                      </span>

                      <span className="font-bold">
                        {pickedSummary?.name}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-gray-500">
                        Language
                      </span>

                      <span className="font-bold">
                        {baseLang === 'en'
                          ? 'English'
                          : 'French'}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-gray-500">
                        Level
                      </span>

                      <span className="font-bold">
                        {pickedComfort?.title}
                      </span>
                    </div>
                  </div>
                </div> */}
              </CardContent>

              {/* Desktop Start */}
              <div className="hidden border-t-2 border-black bg-gray-50 p-4 lg:block">
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!ready}
                  onClick={enter}
                >
                  {enterLabel}
                </Button>
              </div>
            </Card>
          </aside>
        </div>

        <footer className="mt-16 border-t-2 border-black pt-6 text-center">
          {/* <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Speech, voice and dialogue by{' '}
            <span className="text-black">
              Sarvam AI
            </span>
          </p> */}
        </footer>
      </div>

      {/* Mobile Start */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-black bg-white p-4 shadow-[0_-8px_0_0_rgba(0,0,0,0.1)] lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-gray-500">
              Destination
            </p>

            <p className="truncate text-sm font-black uppercase">
              {pickedSummary
                ? `${pickedSummary.city}, ${pickedSummary.native}`
                : 'Select a country'}
            </p>
          </div>

          <Button
            size="lg"
            disabled={!ready}
            onClick={enter}
          >
            {ready ? 'Start' : 'Select'}
          </Button>
        </div>
      </div>
    </main>
  )
}