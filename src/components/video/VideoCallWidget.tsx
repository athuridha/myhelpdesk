import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useUiStore } from '@/store/ui'
import {
  Minimize2,
  Maximize2,
  ExternalLink,
  Copy,
  Check,
  Radio,
  PhoneOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function VideoCallWidget() {
  const { videoCallRoom, isVideoCallMinimized, closeVideoCall, toggleMinimizeVideoCall } = useUiStore()
  const [copied, setCopied] = useState(false)

  if (!videoCallRoom) return null

  const jitsiDomain = 'meet.element.io'
  const sanitizedRoomId = videoCallRoom.roomId.replace(/[^a-zA-Z0-9-_]/g, '')
  const meetingUrl = `https://${jitsiDomain}/${sanitizedRoomId}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const content = (
    <div
      className={cn(
        'fixed z-[100] transition-all duration-300 ease-in-out font-sans',
        isVideoCallMinimized
          ? 'bottom-6 right-6 w-72 sm:w-80 h-48 sm:h-56 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden'
          : 'inset-0 sm:inset-6 md:inset-10 lg:inset-16 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4'
      )}
    >
      <div
        className={cn(
          'bg-slate-900 border border-slate-800 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden w-full h-full',
          !isVideoCallMinimized && 'max-w-5xl max-h-[100dvh] sm:max-h-[90vh]'
        )}
      >
        {/* Header Bar */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider animate-pulse shrink-0">
              <Radio className="w-3 h-3" />
              <span>Live Call</span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[120px] sm:max-w-xs md:max-w-md">
              {videoCallRoom.roomTitle}
            </h3>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {!isVideoCallMinimized && (
              <>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  title="Salin Link Room Meeting"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline text-[11px]">{copied ? 'Tersalin!' : 'Salin Link'}</span>
                </button>

                <a
                  href={meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Buka di Tab Baru"
                >
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </a>
              </>
            )}

            <button
              onClick={toggleMinimizeVideoCall}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isVideoCallMinimized ? 'Perbesar Video' : 'Kecilkan (PIP)'}
            >
              {isVideoCallMinimized ? <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            <button
              onClick={closeVideoCall}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer ml-1"
              title="Akhiri Panggilan Video"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              {!isVideoCallMinimized && <span className="hidden sm:inline text-[11px]">Akhiri</span>}
            </button>
          </div>
        </div>

        {/* Clean meet.element.io Iframe */}
        <div className="flex-1 bg-slate-950 relative w-full h-full min-h-[300px] overflow-y-auto">
          <iframe
            src={meetingUrl}
            allow="camera *; microphone *; display-capture *; autoplay *; clipboard-write *; encrypted-media *; fullscreen *"
            className="w-full h-full min-h-[300px] border-0"
            title={videoCallRoom.roomTitle}
          />
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
