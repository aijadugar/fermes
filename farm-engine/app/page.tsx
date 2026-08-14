'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import ReactMarkdown from 'react-markdown'

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FileText,
  LocateFixed,
  MapPin,
  Mic,
  Phone,
  Send,
  Sprout,
  Store,
  Volume2,
} from 'lucide-react'

import GlobalErrands, {
  ErrandsSelection,
} from '@/components/Errands'

import FermesAssistant from '@/components/FermesAssistant'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toFermesUser, type FermesUser } from '@/lib/auth/types'

import {
  AgentResponse,
  BusinessCandidate,
  SiteReport,
  ToolTrace,
  apiUrl,
  checkHealth,
  errorDetail,
  getSiteReport,
  newSessionId,
  sendAgentMessage,
  traceBusinesses,
  traceHasError,
  traceState,
} from '@/lib/mireye-api'

type Country = 'USA' | 'Canada'

type Coordinates = {
  lat: number
  lon: number
}

type View =
  | 'onboarding'
  | 'form'
  | 'investigating'
  | 'report'

type Message = {
  id: string
  question?: string
  response?: AgentResponse
  error?: string
}

const countryNames: Record<Country, string> = {
  USA: 'United States',
  Canada: 'Canada',
}

const quickActions = [
  {
    label: 'Analyze Location',
    icon: LocateFixed,
    question:
      'Analyze this location for farming suitability.',
  },
  {
    label: 'Crop Suitability',
    icon: Sprout,
    question:
      'Is this location suitable for growing tomatoes?',
  },
  {
    label: 'Find Seed Dealers',
    icon: Store,
    question:
      'Find the nearest seed dealer for this location.',
  },
]

/* -------------------------------------------------------------------------- */
/* Logo                                                                       */
/* -------------------------------------------------------------------------- */

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div>
        <div className="text-xl font-black uppercase tracking-tight">
          Fermes
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Status                                                                     */
/* -------------------------------------------------------------------------- */

function Status({
  online,
}: {
  online: boolean | null
}) {
  return (
    <span
      className="
        inline-flex items-center gap-2
        rounded-full
        border-2 border-black
        bg-white
        px-3 py-1.5
        text-xs font-bold
        shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
      "
    >
      <span
        className={`
          h-2.5 w-2.5 rounded-full border border-black
          ${
            online === true
              ? 'bg-green-400'
              : online === false
                ? 'bg-red-500'
                : 'bg-gray-300'
          }
        `}
      />

      {online === true
        ? 'FERMES API ONLINE'
        : online === false
          ? 'FERMES API OFFLINE'
          : 'CHECKING API'}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* Shell                                                                      */
/* -------------------------------------------------------------------------- */

function Shell({
  children,
  country,
  onChange,
  online,
}: {
  children: React.ReactNode
  country?: Country
  onChange?: () => void
  online: boolean | null
}) {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo />

          {country && (
            <div className="flex items-center gap-2">
              <span
                className="
                  hidden rounded-full
                  border-2 border-black
                  bg-yellow-400
                  px-3 py-1.5
                  text-xs font-black
                  sm:inline-flex
                "
              >
                {countryNames[country]}
              </span>

              {onChange && (
                <button
                  onClick={onChange}
                  className="
                    rounded-md px-3 py-2
                    text-xs font-bold
                    transition
                    hover:bg-gray-100
                  "
                >
                  Change country
                </button>
              )}

              <div className="hidden sm:block">
                <Status online={online} />
              </div>
            </div>
          )}
        </div>
      </header>

      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Coordinates                                                                */
/* -------------------------------------------------------------------------- */

function CoordinatesFields({
  lat,
  lon,
  setLat,
  setLon,
}: {
  lat: string
  lon: string
  setLat: (value: string) => void
  setLon: (value: string) => void
}) {
  const latNum =
    lat === '' ? null : Number(lat)

  const lonNum =
    lon === '' ? null : Number(lon)

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm font-bold">
        <span className="uppercase tracking-wide">
          Latitude
        </span>

        <input
          value={lat}
          onChange={(e) =>
            setLat(e.target.value)
          }
          placeholder="40.7128"
          inputMode="decimal"
          className="
            h-12 rounded-xl
            border-2 border-black
            bg-white
            px-4
            text-sm font-medium
            outline-none
            transition
            placeholder:text-gray-400
            focus:bg-yellow-50
            focus:ring-2
            focus:ring-yellow-400
          "
        />

        {latNum !== null &&
        (!Number.isFinite(latNum) ||
          latNum < -90 ||
          latNum > 90) ? (
          <span className="text-xs font-bold text-red-600">
            Latitude must be between -90 and 90.
          </span>
        ) : (
          <span className="text-xs font-medium text-gray-500">
            Example: 40.7128
          </span>
        )}
      </label>

      <label className="flex flex-col gap-2 text-sm font-bold">
        <span className="uppercase tracking-wide">
          Longitude
        </span>

        <input
          value={lon}
          onChange={(e) =>
            setLon(e.target.value)
          }
          placeholder="-74.0060"
          inputMode="decimal"
          className="
            h-12 rounded-xl
            border-2 border-black
            bg-white
            px-4
            text-sm font-medium
            outline-none
            transition
            placeholder:text-gray-400
            focus:bg-yellow-50
            focus:ring-2
            focus:ring-yellow-400
          "
        />

        {lonNum !== null &&
        (!Number.isFinite(lonNum) ||
          lonNum < -180 ||
          lonNum > 180) ? (
          <span className="text-xs font-bold text-red-600">
            Longitude must be between -180 and 180.
          </span>
        ) : (
          <span className="text-xs font-medium text-gray-500">
            Example: -74.0060
          </span>
        )}
      </label>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Voice Button                                                               */
/* -------------------------------------------------------------------------- */

type SpeechRecognitionResultLike = {
  resultIndex: number
  results: {
    length: number
    [index: number]: { [index: number]: { transcript: string } }
  }
}

function VoiceButton({
  onTranscript,
}: {
  onTranscript?: (text: string) => void
}) {
  const [listening, setListening] = useState(false)
  const recognition = useRef<any>(null)

  const startListening = () => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      alert('Speech recognition is not supported in this browser.')
      return
    }

    const recon = new SpeechRecognitionCtor()
    recon.lang = 'en-IN'
    recon.continuous = true
    recon.interimResults = true

    recon.onresult = (event: SpeechRecognitionResultLike) => {
      let text = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      onTranscript?.(text)
    }

    recon.onerror = () => setListening(false)
    recon.onend = () => setListening(false)

    recognition.current = recon
    recon.start()
    setListening(true)
  }

  const stopListening = () => {
    recognition.current?.stop()
    setListening(false)
  }

  return (
    <button
      type="button"
      onMouseDown={startListening}
      onMouseUp={stopListening}
      onMouseLeave={() => listening && stopListening()}
      onTouchStart={(e) => {
        e.preventDefault()
        startListening()
      }}
      onTouchEnd={stopListening}
      className={`
        inline-flex h-12 shrink-0 items-center gap-2
        rounded-xl border-2 border-black px-4
        text-sm font-black transition select-none
        ${
          listening
            ? 'bg-red-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
            : 'bg-white text-black hover:bg-yellow-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
        }
      `}
    >
      <Mic className="size-4" />
      {listening ? 'Listening...' : 'Hold to talk'}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/* Form Step                                                                  */
/* -------------------------------------------------------------------------- */

function FormStep({
  country,
  onChange,
  onSubmit,
  online,
  lat,
  lon,
  setLat,
  setLon,
  question,
  setQuestion,
  onReport,
  globalSelection,
}: {
  country: Country
  onChange: () => void
  onSubmit: () => void
  online: boolean | null
  lat: string
  lon: string
  setLat: (value: string) => void
  setLon: (value: string) => void
  question: string
  setQuestion: (value: string) => void
  onReport: () => void
  globalSelection: ErrandsSelection | null
}) {
  const valid =
    lat !== '' &&
    lon !== '' &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lon)) &&
    Number(lat) >= -90 &&
    Number(lat) <= 90 &&
    Number(lon) >= -180 &&
    Number(lon) <= 180 &&
    Boolean(question.trim())

  const languageLabel =
    globalSelection?.language === 'fr'
      ? 'French'
      : 'English'

  const comfortLabel =
    globalSelection?.comfort === 'easy'
      ? 'Easy'
      : globalSelection?.comfort === 'hard'
        ? 'Hard'
        : 'Medium'

  return (
    <Shell
      country={country}
      onChange={onChange}
      online={online}
    >
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        {/* Page intro */}
        <div className="mb-10">
          {/* <div className="mb-5 inline-flex items-center gap-2 rounded-full border-2 border-black bg-yellow-400 px-3 py-1.5 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            Step 2 of 2
          </div> */}

          <h1
            className="
              max-w-3xl
              text-4xl font-black
              uppercase leading-[0.95]
              tracking-tighter
              sm:text-5xl
              lg:text-6xl
            "
          >
            Tell Fermes what you want to investigate.
          </h1>

          <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-gray-600 sm:text-lg">
            Provide your farm coordinates and
            ask a question about the site, crop,
            or nearby agricultural services.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          {/* Main form */}
          <section
            className="
              rounded-2xl
              border-2 border-black
              bg-white
              p-5
              shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
              sm:p-8
            "
          >
            <div className="mb-8 flex items-start gap-4">
              <div
                className="
                  flex h-12 w-12 shrink-0
                  items-center justify-center
                  rounded-xl
                  border-2 border-black
                  bg-yellow-400
                  shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                "
              >
                <MapPin className="size-6" />
              </div>

              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">
                  Farm location & question
                </h2>

                <p className="mt-1 text-sm font-medium text-gray-500">
                  Analyzing in{' '}
                  {countryNames[country]}
                  {' · '}
                  Decimal coordinates required
                </p>
              </div>
            </div>

            {/* Preferences */}
            {globalSelection && (
              <div
                className="
                  mb-7
                  rounded-xl
                  border-2 border-black
                  bg-yellow-50
                  p-4
                "
              >
                <div className="mb-4 text-xs font-black uppercase tracking-[0.18em]">
                  Session preferences
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-medium text-gray-500">
                      Country
                    </div>

                    <div className="mt-1 font-black">
                      {globalSelection.country ===
                      'usa'
                        ? 'United States'
                        : 'Canada'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-gray-500">
                      Language
                    </div>

                    <div className="mt-1 font-black">
                      {languageLabel}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-gray-500">
                      Comfort
                    </div>

                    <div className="mt-1 font-black">
                      {comfortLabel}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <CoordinatesFields
              lat={lat}
              lon={lon}
              setLat={setLat}
              setLon={setLon}
            />

            <label className="mt-7 flex flex-col gap-2 text-sm font-bold">
              <span className="uppercase tracking-wide">
                What would you like to know?
              </span>

              <textarea
                value={question}
                onChange={(e) =>
                  setQuestion(e.target.value)
                }
                placeholder="Is this location suitable for growing tomatoes?"
                rows={6}
                className="
                  resize-none
                  rounded-xl
                  border-2 border-black
                  bg-white
                  px-4 py-3
                  text-sm font-medium
                  leading-6
                  outline-none
                  transition
                  placeholder:text-gray-400
                  focus:bg-yellow-50
                  focus:ring-2
                  focus:ring-yellow-400
                "
              />
            </label>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={onSubmit}
                disabled={!valid}
                className="
                  inline-flex h-12 flex-1
                  items-center justify-center
                  gap-2
                  rounded-xl
                  border-2 border-black
                  bg-yellow-400
                  px-5
                  text-sm font-black
                  text-black
                  shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                  transition
                  hover:bg-yellow-500
                  active:translate-x-[2px]
                  active:translate-y-[2px]
                  active:shadow-none
                  disabled:pointer-events-none
                  disabled:opacity-40
                "
              >
                <Sprout className="size-4" />

                Investigate with Fermes
              </button>

              <VoiceButton onTranscript={(text) => setQuestion(text)} />
            </div>

            {/* Quick actions */}
            <div className="mt-8 border-t-2 border-black pt-6">
              <div className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                Quick actions
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {quickActions.map(
                  ({
                    label,
                    icon: Icon,
                    question: value,
                  }) => (
                    <button
                      key={label}
                      onClick={() =>
                        setQuestion(value)
                      }
                      className="
                        group
                        flex items-center gap-3
                        rounded-xl
                        border-2 border-black
                        bg-white
                        px-4 py-3
                        text-left
                        text-xs font-black
                        transition
                        hover:-translate-y-0.5
                        hover:bg-yellow-50
                        hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                      "
                    >
                      <Icon className="size-4" />

                      {label}

                      <ArrowRight className="ml-auto size-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  )
                )}

                <button
                  onClick={onReport}
                  disabled={
                    !valid ||
                    !lat ||
                    !lon
                  }
                  className="
                    group
                    flex items-center gap-3
                    rounded-xl
                    border-2 border-black
                    bg-white
                    px-4 py-3
                    text-left
                    text-xs font-black
                    transition
                    hover:-translate-y-0.5
                    hover:bg-yellow-50
                    hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                    disabled:pointer-events-none
                    disabled:opacity-35
                  "
                >
                  <FileText className="size-4" />

                  Generate Site Report

                  <ArrowRight className="ml-auto size-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </section>

          {/* Side information */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div
              className="
                rounded-2xl
                border-2 border-black
                bg-yellow-400
                p-6
                shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
              "
            >
              <Sprout className="mb-5 size-8" />

              <h2 className="text-2xl font-black uppercase leading-tight">
                Turn coordinates into farming decisions.
              </h2>

              <p className="mt-4 text-sm font-medium leading-6">
                Fermes combines location intelligence
                with agricultural data to help you
                understand your land.
              </p>
            </div>

            <div
              className="
                rounded-2xl
                border-2 border-black
                bg-white
                p-6
                shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
              "
            >
              <div className="mb-4 text-xs font-black uppercase tracking-widest text-gray-500">
                Fermes can help with
              </div>

              <div className="space-y-3 text-sm font-bold">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-yellow-400">
                    <MapPin className="size-4" />
                  </span>

                  Land & location
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-yellow-400">
                    <Sprout className="size-4" />
                  </span>

                  Crop suitability
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-yellow-400">
                    <Store className="size-4" />
                  </span>

                  Nearby suppliers
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-yellow-400">
                    <FileText className="size-4" />
                  </span>

                  Site reports
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-16 border-t-2 border-black pt-6 text-center">
          {/* <p className="text-xs font-black uppercase tracking-widest text-gray-500">
            Speech, voice and dialogue by{' '}
            <span className="text-black">
              Sarvam AI
            </span>
          </p> */}
        </footer>
      </main>
    </Shell>
  )
}

/* -------------------------------------------------------------------------- */
/* Timeline                                                                   */
/* -------------------------------------------------------------------------- */

function Timeline({
  trace,
}: {
  trace: ToolTrace[]
}) {
  const [open, setOpen] =
    useState<number | null>(null)

  if (!trace.length) {
    return null
  }

  return (
    <section
      className="
        rounded-2xl
        border-2 border-black
        bg-white
        p-5
        shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
      "
    >
      <button
        onClick={() =>
          setOpen(
            open === -1 ? null : -1
          )
        }
        className="flex w-full items-center justify-between text-left"
      >
        <span>
          <span className="block text-xs font-black uppercase tracking-[0.18em]">
            Investigation timeline
          </span>

          <span className="mt-1 block text-sm font-medium text-gray-500">
            {traceHasError(trace)
              ? 'Some site data could not be retrieved'
              : 'Fermes completed the investigation'}
          </span>
        </span>

        {open === -1 ? (
          <ChevronDown className="size-5" />
        ) : (
          <ChevronRight className="size-5" />
        )}
      </button>

      <div className="mt-5 flex flex-col gap-3">
        {trace.map(
          (item, index) => {
            const state =
              traceState(item)

            const error =
              state === 'Failed'

            const label =
              item.tool ===
              'resolve_location'
                ? 'Resolving location'
                : item.tool ===
                    'find_nearby_business'
                  ? 'Searching nearby agricultural businesses'
                  : item.tool ===
                      'check_site_suitability'
                    ? 'Analyzing site suitability'
                    : 'Investigating site data'

            return (
              <div
                key={`${item.tool}-${index}`}
                className="
                  rounded-xl
                  border-2 border-black
                  bg-gray-50
                  p-4
                "
              >
                <button
                  className="flex w-full items-center gap-3 text-left"
                  onClick={() =>
                    setOpen(
                      open === index
                        ? null
                        : index
                    )
                  }
                >
                  <span
                    className={`
                      grid size-8 place-items-center
                      rounded-lg
                      border-2 border-black
                      ${
                        error
                          ? 'bg-red-100 text-red-600'
                          : 'bg-yellow-400 text-black'
                      }
                    `}
                  >
                    <Activity className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <code className="block text-xs font-black">
                      {item.tool ||
                        'unknown_tool'}
                    </code>

                    <span className="block text-xs font-medium text-gray-500">
                      {label}
                    </span>
                  </span>

                  <span
                    className={`
                      text-xs font-black
                      ${
                        error
                          ? 'text-red-600'
                          : 'text-green-700'
                      }
                    `}
                  >
                    {state}
                  </span>

                  {open === index ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>

                {open === index && (
                  <div className="mt-4 grid gap-3 border-t-2 border-black pt-4 text-xs">
                    <div>
                      <div className="mb-1 font-black uppercase tracking-wide text-gray-500">
                        Arguments
                      </div>

                      <pre className="overflow-auto whitespace-pre-wrap rounded-lg border border-black bg-white p-3">
                        {JSON.stringify(
                          item.args || {},
                          null,
                          2
                        )}
                      </pre>
                    </div>

                    <div>
                      <div className="mb-1 font-black uppercase tracking-wide text-gray-500">
                        Result
                      </div>

                      <pre className="overflow-auto whitespace-pre-wrap rounded-lg border border-black bg-white p-3">
                        {JSON.stringify(
                          item.result || {},
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )
          }
        )}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Investigation                                                              */
/* -------------------------------------------------------------------------- */

function Investigation({
  country,
  coords,
  question,
  report,
  error,
  onBack,
  onReport,
  globalSelection,
}: {
  country: Country
  coords: Coordinates
  question: string
  report: SiteReport | null
  error: string
  onBack: () => void
  onReport: () => void
  globalSelection: ErrandsSelection | null
}) {
  return (
    <Shell country={country} onChange={onBack} online={null}>
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="mb-8 inline-flex items-center gap-2 rounded-lg border-2 border-black bg-white px-3 py-2 text-sm font-black transition hover:bg-yellow-400 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
        >
          <ArrowLeft className="size-4" />
          Back to investigation
        </button>

        <div className="mb-9">
          <div className="mb-4 inline-flex rounded-full border-2 border-black bg-yellow-400 px-3 py-1.5 text-xs font-black uppercase tracking-widest">
            Fermes Investigation
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight sm:text-5xl">
            Site Intelligence
          </h1>
          <p className="mt-3 font-mono text-sm font-bold text-gray-500">
            {coords.lat}, {coords.lon}
          </p>
          <p className="mt-1 text-sm font-bold">{countryNames[country]}</p>
        </div>

        <section className="mb-5 rounded-2xl border-2 border-black bg-white p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
            Your question
          </div>
          <p className="mt-3 text-lg font-bold leading-8">{question}</p>
        </section>

        {error ? (
          <div className="mb-5 rounded-2xl border-2 border-red-600 bg-red-50 p-5">
            <h2 className="font-black uppercase">Fermes API is unavailable</h2>
            <p className="mt-2 text-sm font-medium text-gray-600">{error}</p>
            <p className="mt-2 text-xs font-medium text-gray-500">
              Please check that the backend is running at {apiUrl()}
            </p>
          </div>
        ) : report ? (
          <>
            <section
              className={`mb-5 rounded-2xl border-2 border-black p-6 shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] ${
                report.verdict === 'suitable'
                  ? 'bg-green-300'
                  : report.verdict === 'marginal'
                    ? 'bg-yellow-400'
                    : 'bg-red-300'
              }`}
            >
              <div className="text-xs font-black uppercase tracking-[0.18em]">
                Verdict
              </div>
              <div className="mt-4 text-4xl font-black uppercase">
                {report.verdict || 'Unknown'}
              </div>
            </section>

            <section className="mb-5 rounded-2xl border-2 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-black bg-yellow-400">
                  <Sprout className="size-5" />
                </div>
                <h2 className="text-2xl font-black uppercase">
                  Fermes&apos; assessment
                </h2>
              </div>
              <div className="prose max-w-none text-sm leading-7 prose-headings:font-black prose-p:text-gray-600 prose-strong:text-black prose-li:text-gray-600">
                <ReactMarkdown>
                  {report.summary || 'No summary returned.'}
                </ReactMarkdown>
              </div>
              {report.summary_source && (
                <p className="mt-4 text-xs font-bold text-gray-500">
                  Source: {report.summary_source}
                </p>
              )}
            </section>

            {report.facts?.length ? (
              <section className="mb-5 rounded-2xl border-2 border-black bg-white p-6">
                <h2 className="text-2xl font-black uppercase">Facts</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {report.facts.map((fact, index) => (
                    <div
                      key={`${fact.name}-${index}`}
                      className="rounded-xl border-2 border-black bg-yellow-50 p-4"
                    >
                      <div className="text-xs font-black uppercase text-gray-500">
                        {fact.name || 'Fact'}
                      </div>
                      <div className="mt-1 font-black">
                        {String(fact.value ?? '—')}
                      </div>
                      {fact.source && (
                        <div className="mt-1 text-xs font-medium text-gray-500">
                          {fact.source}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mt-5 rounded-2xl border-2 border-black bg-white p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-black bg-yellow-400">
                  <MapPin className="size-4" />
                </div>
                <h2 className="text-2xl font-black uppercase">Site location</h2>
              </div>

              <div className="grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <div className="text-xs font-bold uppercase text-gray-500">
                    Latitude
                  </div>
                  <div className="mt-1 font-mono font-bold">
                    {report.location?.lat ?? coords.lat}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-gray-500">
                    Longitude
                  </div>
                  <div className="mt-1 font-mono font-bold">
                    {report.location?.lon ?? coords.lon}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-gray-500">
                    Country
                  </div>
                  <div className="mt-1 font-bold">{countryNames[country]}</div>
                </div>
              </div>

              <button
                onClick={onReport}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border-2 border-black bg-yellow-400 px-4 py-2.5 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:bg-yellow-500 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                <FileText className="size-4" />
                Generate detailed site report
              </button>
            </section>
          </>
        ) : (
          <div className="rounded-2xl border-2 border-black bg-yellow-50 p-6 text-sm font-bold shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            Fermes is gathering site intelligence...
          </div>
        )}
      </main>
      <FermesAssistant lat={coords.lat} lon={coords.lon} />
    </Shell>
  )
}

/* -------------------------------------------------------------------------- */
/* Business Card                                                              */
/* -------------------------------------------------------------------------- */

function BusinessCard({
  business,
}: {
  business: BusinessCandidate
}) {
  return (
    <div
      className="
        rounded-2xl
        border-2 border-black
        bg-white
        p-5
        transition
        hover:-translate-y-1
        hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]
      "
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-black uppercase">
            {business.name ||
              'Nearby agricultural business'}
          </h3>

          <p className="mt-1 text-sm font-medium leading-6 text-gray-500">
            {business.address ||
              'Address unavailable'}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-yellow-400">
          <Store className="size-4" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {business.rating !==
          undefined && (
          <span className="rounded-full border-2 border-black bg-gray-100 px-2.5 py-1 text-xs font-bold">
            Rating {business.rating}
          </span>
        )}

        {business.phone && (
          <a
            href={`tel:${business.phone}`}
            className="
              inline-flex items-center gap-1
              rounded-full
              border-2 border-black
              bg-yellow-400
              px-2.5 py-1
              text-xs font-black
            "
          >
            <Phone className="size-3" />

            Call
          </a>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Report                                                                     */
/* -------------------------------------------------------------------------- */

function Report({
  country,
  coords,
  initialQuestion,
  onBack,
}: {
  country: Country
  coords: Coordinates
  initialQuestion?: string
  onBack: () => void
}) {
  const [report, setReport] =
    useState<SiteReport | null>(null)

  const [question, setQuestion] =
  useState(initialQuestion ?? '')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const load = async (q?: string) => {
    setLoading(true)
    setError('')

    try {
      setReport(
        await getSiteReport(
          coords.lat,
          coords.lon,
          q
        )
      )
    } catch (e) {
      setError(
        errorDetail(e).message
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
  void load(initialQuestion)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [coords.lat, coords.lon])

  const location =
    report?.location || coords

  return (
    <Shell
      country={country}
      onChange={onBack}
      online={null}
    >
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="
            mb-8
            inline-flex items-center gap-2
            rounded-lg
            border-2 border-black
            bg-white
            px-3 py-2
            text-sm font-black
            transition
            hover:bg-yellow-400
            hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
          "
        >
          <ArrowLeft className="size-4" />

          Back to investigation
        </button>

        <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-4 inline-flex rounded-full border-2 border-black bg-yellow-400 px-3 py-1.5 text-xs font-black uppercase tracking-widest">
              Fermes Site Intelligence
            </div>

            <h1 className="text-4xl font-black uppercase tracking-tight sm:text-5xl">
              Site Report
            </h1>

            <p className="mt-3 font-mono text-sm font-bold text-gray-500">
              {coords.lat}, {coords.lon}
            </p>

            <p className="mt-1 text-sm font-bold">
              {countryNames[country]}
            </p>
          </div>

          <details className="rounded-xl border-2 border-black bg-white p-3 text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <summary className="cursor-pointer font-black">
              Developer details
            </summary>

            <p className="mt-2 font-mono">
              GET /v1/site-report
            </p>
          </details>
        </div>

        {loading ? (
          <div
            className="
              rounded-2xl
              border-2 border-black
              bg-yellow-50
              p-8
              text-sm font-bold
              shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
            "
          >
            Fermes is gathering site intelligence...
          </div>
        ) : error ? (
          <div className="rounded-2xl border-2 border-red-600 bg-red-50 p-6">
            <h2 className="font-black uppercase">
              Site report could not be generated
            </h2>

            <p className="mt-2 text-sm font-medium text-gray-600">
              {error}
            </p>

            <button
              onClick={() => void load()}
              className="
                mt-5
                rounded-xl
                border-2 border-black
                bg-yellow-400
                px-4 py-2
                text-sm font-black
                shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
              "
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <section
                className="
                  rounded-2xl
                  border-2 border-black
                  bg-yellow-400
                  p-6
                  shadow-[7px_7px_0px_0px_rgba(0,0,0,1)]
                "
              >
                <div className="text-xs font-black uppercase tracking-[0.18em]">
                  Verdict
                </div>

                <div className="mt-4 text-4xl font-black uppercase">
                  {report?.verdict ||
                    'Unknown'}
                </div>

                <p className="mt-3 text-sm font-medium">
                  Exact assessment returned by
                  Fermes.
                </p>
              </section>

              <section
                className="
                  rounded-2xl
                  border-2 border-black
                  bg-white
                  p-6
                  shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
                "
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-black bg-yellow-400">
                    <MapPin className="size-4" />
                  </div>

                  <h2 className="text-2xl font-black uppercase">
                    Farm location
                  </h2>
                </div>

                <div className="relative grid min-h-40 place-items-center overflow-hidden rounded-xl border-2 border-black bg-gray-100">
                  <div
                    className="absolute inset-0 opacity-50"
                    style={{
                      backgroundImage:
                        'linear-gradient(#d1d5db 1px, transparent 1px), linear-gradient(90deg, #d1d5db 1px, transparent 1px)',
                      backgroundSize:
                        '28px 28px',
                    }}
                  />

                  <div className="relative text-center">
                    <MapPin className="mx-auto size-8" />

                    <p className="mt-2 font-mono text-sm font-bold">
                      {location.lat},{' '}
                      {location.lon}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <section
              className="
                mt-6
                rounded-2xl
                border-2 border-black
                bg-white
                p-6
                shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
              "
            >
              <h2 className="text-2xl font-black uppercase">
                Farm suitability analysis
              </h2>

              <div className="prose prose-sm mt-4 max-w-none font-medium leading-7 text-gray-600">
                <ReactMarkdown>
                  {report?.summary || 'No summary returned.'}
                </ReactMarkdown>
              </div>

              {report?.summary_source && (
                <p className="mt-4 text-xs font-bold text-gray-500">
                  Source:{' '}
                  {report.summary_source}
                </p>
              )}
            </section>

            <section
              className="
                mt-6
                rounded-2xl
                border-2 border-black
                bg-white
                p-6
              "
            >
              <h2 className="text-2xl font-black uppercase">
                Facts
              </h2>

              {report?.facts?.length ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {report.facts.map(
                    (fact, index) => (
                      <div
                        key={`${fact.name}-${index}`}
                        className="
                          rounded-xl
                          border-2 border-black
                          bg-yellow-50
                          p-4
                        "
                      >
                        <div className="text-xs font-black uppercase text-gray-500">
                          {fact.name ||
                            'Fact'}
                        </div>

                        <div className="mt-1 font-black">
                          {String(
                            fact.value ??
                              '—'
                          )}
                        </div>

                        {fact.source && (
                          <div className="mt-1 text-xs font-medium text-gray-500">
                            {fact.source}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm font-medium text-gray-500">
                  No structured facts available
                  for this site.
                </p>
              )}
            </section>

            <section
              className="
                mt-6
                rounded-2xl
                border-2 border-black
                bg-white
                p-6
                shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]
              "
            >
              <h2 className="text-2xl font-black uppercase">
                Ask Fermes about this site
              </h2>

              <textarea
                value={question}
                onChange={(e) =>
                  setQuestion(
                    e.target.value
                  )
                }
                placeholder="Is this a good spot to grow crops?"
                rows={4}
                className="
                  mt-4 w-full
                  resize-none
                  rounded-xl
                  border-2 border-black
                  bg-white
                  p-4
                  text-sm font-medium
                  outline-none
                  focus:bg-yellow-50
                  focus:ring-2
                  focus:ring-yellow-400
                "
              />

              <button
                onClick={() =>
                  void load(question)
                }
                className="
                  mt-4
                  inline-flex items-center gap-2
                  rounded-xl
                  border-2 border-black
                  bg-yellow-400
                  px-5 py-2.5
                  text-sm font-black
                  shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                  transition
                  hover:bg-yellow-500
                  active:translate-x-[2px]
                  active:translate-y-[2px]
                  active:shadow-none
                "
              >
                <Send className="size-4" />

                Ask Fermes
              </button>
            </section>
          </>
        )}

        <footer className="mt-16 border-t-2 border-black pt-6 text-center">
          {/* <p className="text-xs font-black uppercase tracking-widest text-gray-500">
            Speech, voice and dialogue by{' '}
            <span className="text-black">
              Sarvam AI
            </span>
          </p> */}
        </footer>
      </main>
      <FermesAssistant lat={coords.lat} lon={coords.lon} />
    </Shell>
  )
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function Page() {

  /* ------------------------------------------------------------------------ */
  /* Login session
  /* ------------------------------------------------------------------------ */

  const [user, setUser] = useState<FermesUser | null>(null)
const [authChecked, setAuthChecked] = useState(false)
const router = useRouter()

useEffect(() => {
  const supabase = createClient()

  supabase.auth.getUser().then(({ data }) => {
    setUser(toFermesUser(data.user))
    setAuthChecked(true)
  })

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(toFermesUser(session?.user ?? null))
  })

  return () => subscription.unsubscribe()
}, [])

  const [view, setView] =
    useState<View>('onboarding')

  const [country, setCountry] =
    useState<Country | null>(null)

  const [globalSelection, setGlobalSelection] =
    useState<ErrandsSelection | null>(
      null
    )

  const [lat, setLat] =
    useState('')

  const [lon, setLon] =
    useState('')

  const [question, setQuestion] =
    useState('')

  const [online, setOnline] =
    useState<boolean | null>(null)

  const [sessionId, setSessionId] =
    useState('')

  const [response, setResponse] =
    useState<AgentResponse | null>(null)

  const [reportResult, setReportResult] =
    useState<SiteReport | null>(null)

  const [error, setError] =
    useState('')

  /* ------------------------------------------------------------------------ */
  /* Initialize session + API health                                         */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    setSessionId(newSessionId())

    checkHealth()
      .then((result) =>
        setOnline(result.ok === true)
      )
      .catch(() =>
        setOnline(false)
      )
  }, [])

  if (!authChecked || !user) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
      <p className="text-sm font-bold text-gray-500">Loading Fermes...</p>
    </div>
  )
}

  /* ------------------------------------------------------------------------ */
  /* Global Errands Start                                                     */
  /* ------------------------------------------------------------------------ */

  const handleGlobalStart = (
    selection: ErrandsSelection
  ) => {
    console.log(
      'Global Errands selection:',
      selection
    )

    setGlobalSelection(selection)

    setCountry(
      selection.country === 'usa'
        ? 'USA'
        : 'Canada'
    )

    setView('form')
  }

  /* ------------------------------------------------------------------------ */
  /* Submit Investigation                                                    */
  /* ------------------------------------------------------------------------ */

  const submit = async () => {
  if (!globalSelection) {
    setError('Please select your language and comfort level first.')
    return
  }

  setError('')
  setResponse(null)
  setView('investigating')

  try {
    const result = await getSiteReport(
      Number(lat),
      Number(lon),
      question.trim()
    )

    setReportResult(result)
  } catch (e) {
    setError(errorDetail(e).message)
  }
}

 const goToReport = () => {
  if (!globalSelection) {
    setError(
      'Please select your language and comfort level first.'
    )
    return
  }

  setError('')
  setView('report')
}

  /* ------------------------------------------------------------------------ */
  /* Coordinates                                                              */
  /* ------------------------------------------------------------------------ */

  const coords: Coordinates = {
    lat: Number(lat),
    lon: Number(lon),
  }

  /* ------------------------------------------------------------------------ */
  /* Onboarding                                                               */
  /* ------------------------------------------------------------------------ */

  if (view === 'onboarding') {
    return (
      <GlobalErrands
        onStart={handleGlobalStart}
      />
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Safety fallback                                                          */
  /* ------------------------------------------------------------------------ */

  if (!country) {
    return (
      <GlobalErrands
        onStart={handleGlobalStart}
      />
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Report                                                                   */
  /* ------------------------------------------------------------------------ */

  if (view === 'report') {
    return (
      <Report
        country={country}
        coords={coords}
        initialQuestion={question}
        onBack={() =>
          setView('form')
        }
      />
    )
  }

  /* ------------------------------------------------------------------------ */
  /* Investigation                                                            */
  /* ------------------------------------------------------------------------ */

if (view === 'investigating') {
  return (
    <Investigation
      country={country}
      coords={coords}
      question={question}
      report={reportResult}
      error={error}
      globalSelection={globalSelection}
      onBack={() => setView('form')}
      onReport={() => setView('report')}
    />
  )
}

  /* ------------------------------------------------------------------------ */
  /* Form                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <FormStep
      country={country}
      onChange={() => {
        setCountry(null)
        setGlobalSelection(null)
        setView('onboarding')
      }}
      onSubmit={submit}
      online={online}
      lat={lat}
      lon={lon}
      setLat={setLat}
      setLon={setLon}
      question={question}
      setQuestion={setQuestion}
      globalSelection={globalSelection}
      onReport={goToReport}
    />
  )
}