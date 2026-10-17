'use client'

import { useState, useCallback } from 'react'
import { verifyPin } from '@/lib/pin'
import { usePricesHidden, usePriceBlurFeatureEnabled } from '@/hooks/usePricesHidden'
import { togglePricesHidden } from '@/lib/priceVisibility'
import { requestMotionPermission, needsMotionPermission, markMotionPermissionAsked } from '@/lib/deviceFlip'

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'back'],
]

interface Props {
  onUnlock: () => void
  onCancel?: () => void
  onForgotPin?: () => void
}

function IconEye() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 8.25C9.92893 8.25 8.25 9.92893 8.25 12C8.25 14.0711 9.92893 15.75 12 15.75C14.0711 15.75 15.75 14.0711 15.75 12C15.75 9.92893 14.0711 8.25 12 8.25ZM9.75 12C9.75 10.7574 10.7574 9.75 12 9.75C13.2426 9.75 14.25 10.7574 14.25 12C14.25 13.2426 13.2426 14.25 12 14.25C10.7574 14.25 9.75 13.2426 9.75 12Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 3.25C7.48587 3.25 4.44529 5.9542 2.68057 8.24686L2.64874 8.2882C2.24964 8.80653 1.88206 9.28392 1.63269 9.8484C1.36564 10.4529 1.25 11.1117 1.25 12C1.25 12.8883 1.36564 13.5471 1.63269 14.1516C1.88206 14.7161 2.24964 15.1935 2.64875 15.7118L2.68057 15.7531C4.44529 18.0458 7.48587 20.75 12 20.75C16.5141 20.75 19.5547 18.0458 21.3194 15.7531L21.3512 15.7118C21.7504 15.1935 22.1179 14.7161 22.3673 14.1516C22.6344 13.5471 22.75 12.8883 22.75 12C22.75 11.1117 22.6344 10.4529 22.3673 9.8484C22.1179 9.28391 21.7504 8.80652 21.3512 8.28818L21.3194 8.24686C19.5547 5.9542 16.5141 3.25 12 3.25ZM3.86922 9.1618C5.49864 7.04492 8.15036 4.75 12 4.75C15.8496 4.75 18.5014 7.04492 20.1308 9.1618C20.5694 9.73159 20.8263 10.0721 20.9952 10.4545C21.1532 10.812 21.25 11.2489 21.25 12C21.25 12.7511 21.1532 13.188 20.9952 13.5455C20.8263 13.9279 20.5694 14.2684 20.1308 14.8382C18.5014 16.9551 15.8496 19.25 12 19.25C8.15036 19.25 5.49864 16.9551 3.86922 14.8382C3.43064 14.2684 3.17374 13.9279 3.00476 13.5455C2.84684 13.188 2.75 12.7511 2.75 12C2.75 11.2489 2.84684 10.812 3.00476 10.4545C3.17374 10.0721 3.43063 9.73159 3.86922 9.1618Z" fill="currentColor"/>
    </svg>
  )
}

function IconEyeClosed() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M22.2954 6.31083C22.6761 6.474 22.8524 6.91491 22.6893 7.29563L21.9999 7.00019C22.6893 7.29563 22.6894 7.29546 22.6893 7.29563L22.6886 7.29731L22.6875 7.2998L22.6843 7.30716L22.6736 7.33123C22.6646 7.35137 22.6518 7.37958 22.6352 7.41527C22.6019 7.48662 22.5533 7.58794 22.4888 7.71435C22.3599 7.967 22.1675 8.32087 21.9084 8.73666C21.4828 9.4197 20.8724 10.2778 20.0619 11.1304L21.0303 12.0987C21.3231 12.3916 21.3231 12.8665 21.0303 13.1594C20.7374 13.4523 20.2625 13.4523 19.9696 13.1594L18.969 12.1588C18.3093 12.7115 17.5528 13.2302 16.695 13.6564L17.6286 15.0912C17.8545 15.4383 17.7562 15.9029 17.409 16.1288C17.0618 16.3547 16.5972 16.2564 16.3713 15.9092L15.2821 14.2353C14.5028 14.4898 13.659 14.6628 12.7499 14.7248V16.5002C12.7499 16.9144 12.4141 17.2502 11.9999 17.2502C11.5857 17.2502 11.2499 16.9144 11.2499 16.5002V14.7248C10.3689 14.6647 9.54909 14.5004 8.78982 14.2586L7.71575 15.9093C7.48984 16.2565 7.02526 16.3548 6.67807 16.1289C6.33089 15.903 6.23257 15.4384 6.45847 15.0912L7.37089 13.689C6.5065 13.2668 5.74381 12.7504 5.07842 12.1984L4.11744 13.1594C3.82455 13.4523 3.34968 13.4523 3.05678 13.1594C2.76389 12.8665 2.76389 12.3917 3.05678 12.0988L3.98055 11.175C3.15599 10.3153 2.53525 9.44675 2.10277 8.75486C1.83984 8.33423 1.6446 7.97584 1.51388 7.71988C1.44848 7.59182 1.3991 7.48914 1.36537 7.41683C1.3485 7.38067 1.33553 7.35207 1.32641 7.33167L1.31562 7.30729L1.31238 7.29984L1.31129 7.29733L1.31088 7.29638C1.31081 7.2962 1.31056 7.29563 1.99992 7.00019L1.31088 7.29638C1.14772 6.91565 1.32376 6.474 1.70448 6.31083C2.08489 6.1478 2.52539 6.32374 2.68888 6.70381L2.68983 6.706L2.69591 6.71972C2.7018 6.73291 2.7114 6.7541 2.72472 6.78267C2.75139 6.83983 2.79296 6.92644 2.84976 7.03767C2.96345 7.26029 3.13762 7.58046 3.37472 7.95979C3.85033 8.72067 4.57157 9.70728 5.55561 10.6218C6.42151 11.4265 7.48259 12.1678 8.75165 12.656C9.70614 13.0232 10.7854 13.2502 11.9999 13.2502C13.2416 13.2502 14.342 13.013 15.3124 12.631C16.5738 12.1345 17.6277 11.3884 18.4866 10.5822C19.4562 9.67216 20.1668 8.69535 20.6354 7.9434C20.869 7.5685 21.0405 7.25246 21.1525 7.03286C21.2085 6.92315 21.2494 6.83776 21.2757 6.78144C21.2888 6.75328 21.2983 6.73242 21.3041 6.71943L21.31 6.70595C21.4738 6.32423 21.9147 6.14771 22.2954 6.31083Z" fill="currentColor"/>
    </svg>
  )
}

function IconBack() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M11.0303 8.96967C10.7374 8.67678 10.2625 8.67678 9.96965 8.96967C9.67676 9.26256 9.67676 9.73744 9.96965 10.0303L11.9393 12L9.96967 13.9697C9.67678 14.2626 9.67678 14.7374 9.96967 15.0303C10.2626 15.3232 10.7374 15.3232 11.0303 15.0303L13 13.0607L14.9696 15.0303C15.2625 15.3232 15.7374 15.3232 16.0303 15.0303C16.3232 14.7374 16.3232 14.2625 16.0303 13.9697L14.0606 12L16.0303 10.0304C16.3232 9.73746 16.3232 9.26258 16.0303 8.96969C15.7374 8.6768 15.2625 8.6768 14.9696 8.96969L13 10.9394L11.0303 8.96967Z" fill="currentColor" />
      <path fillRule="evenodd" clipRule="evenodd" d="M21.3191 4.63407C20.5538 3.88938 19.5855 3.55963 18.3866 3.40278C17.2186 3.24997 15.7251 3.24999 13.8342 3.25H11.1058C10.0228 3.24999 9.15832 3.24999 8.45039 3.31591C7.71946 3.38398 7.09979 3.52598 6.51512 3.84132C5.92948 4.15718 5.47496 4.59515 5.02578 5.16537C4.59197 5.7161 4.13289 6.43088 3.55968 7.32338L2.83702 8.44855C2.35887 9.19299 1.96846 9.80083 1.7023 10.3305C1.42424 10.8839 1.25 11.411 1.25 12C1.25 12.589 1.42424 13.1161 1.7023 13.6695C1.96845 14.1992 2.35886 14.807 2.83699 15.5514L3.55969 16.6766C4.1329 17.5691 4.59197 18.2839 5.02578 18.8346C5.47496 19.4048 5.92948 19.8428 6.51512 20.1587C7.09979 20.474 7.71947 20.616 8.45039 20.6841C9.15831 20.75 10.0228 20.75 11.1058 20.75H13.8341C15.725 20.75 17.2186 20.75 18.3866 20.5972C19.5855 20.4404 20.5538 20.1106 21.3191 19.3659C22.0872 18.6185 22.4299 17.6679 22.5924 16.4917C22.75 15.3511 22.75 13.8943 22.75 12.0577V11.9422C22.75 10.1056 22.75 8.64883 22.5924 7.50827C22.4299 6.33205 22.0872 5.38153 21.3191 4.63407ZM13.779 4.75C15.7373 4.75 17.1327 4.75151 18.192 4.89011C19.2319 5.02615 19.8343 5.2822 20.273 5.70908C20.7088 6.13319 20.9681 6.71126 21.1066 7.71356C21.2483 8.73957 21.25 10.0926 21.25 12C21.25 13.9074 21.2483 15.2604 21.1066 16.2864C20.9681 17.2887 20.7088 17.8668 20.273 18.2909C19.8343 18.7178 19.2319 18.9738 18.192 19.1099C17.1327 19.2485 15.7373 19.25 13.779 19.25H11.142C10.0146 19.25 9.21982 19.2493 8.58947 19.1906C7.97424 19.1333 7.5722 19.0246 7.22717 18.8385C6.88311 18.6529 6.57764 18.3806 6.20411 17.9064C5.82029 17.4192 5.39961 16.7657 4.80167 15.8347L4.12086 14.7747C3.61571 13.9882 3.26903 13.4466 3.04261 12.996C2.82407 12.5611 2.75 12.2714 2.75 12C2.75 11.7286 2.82407 11.4389 3.04261 11.004C3.26903 10.5534 3.61571 10.0118 4.12086 9.22531L4.80167 8.16532C5.39961 7.23433 5.82029 6.58082 6.20411 6.09357C6.57764 5.61938 6.88311 5.34711 7.22717 5.16154C7.5722 4.97545 7.97424 4.86674 8.58947 4.80945C9.21982 4.75075 10.0146 4.75 11.142 4.75L13.779 4.75Z" fill="currentColor" />
    </svg>
  )
}

export default function PinLock({ onUnlock, onCancel, onForgotPin }: Props) {
  const [digits, setDigits] = useState<string[]>([])
  const [shaking, setShaking] = useState(false)
  const [showError, setShowError] = useState(false)
  const pricesHidden = usePricesHidden()
  const priceBlurFeatureEnabled = usePriceBlurFeatureEnabled()

  const handleKey = useCallback(
    (key: string) => {
      if (key === 'back') {
        setDigits((d) => d.slice(0, -1))
        return
      }
      if (shaking) return

      const next = [...digits, key]
      if (next.length > 4) return
      setDigits(next)

      if (next.length === 4) {
        const ok = verifyPin(next.join(''))
        if (ok) {
          onUnlock()
        } else {
          setShaking(true)
          setShowError(true)
          setTimeout(() => {
            setDigits([])
            setShaking(false)
            setShowError(false)
          }, 600)
        }
      }
    },
    [digits, shaking, onUnlock],
  )

  return (
    <div className="fixed inset-0 z-[100] bg-[#F7F4F1] flex flex-col items-center justify-center select-none">
      {onCancel && (
        <button
          onClick={onCancel}
          className="absolute left-5 flex items-center gap-1.5 text-[#9b7653] font-slab text-[15px]"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Назад
        </button>
      )}
      <p className="text-[22px] font-semibold font-slab text-[#2c1a0e] mb-12">
        Введите PIN-код
      </p>

      <div className={`flex gap-5 mb-5 ${shaking ? 'animate-pin-shake' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-[14px] h-[14px] rounded-full transition-all duration-150 ${
              i < digits.length ? 'bg-[#9b7653]' : 'border-2 border-[#c4a88a]'
            }`}
          />
        ))}
      </div>

      <div className="h-5 mb-8">
        {showError && (
          <p className="text-red-400 text-sm font-slab text-center">Неверный PIN</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-3">
            {row.map((key, ki) => {
              if (key === '') {
                return <div key={ki} className="w-[76px] h-[76px]" />
              }
              return (
                <button
                  key={ki}
                  onPointerDown={(e) => { e.preventDefault(); handleKey(key) }}
                  className={`w-[76px] h-[76px] rounded-full font-slab text-[26px] font-medium flex items-center justify-center transition-all duration-100 active:scale-95 ${
                    key === 'back'
                      ? 'text-[#9b7653]'
                      : 'bg-white text-[#2c1a0e] shadow-sm border border-[#e5d9cc]'
                  }`}
                >
                  {key === 'back' ? <IconBack /> : key}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {onForgotPin && (
        <button
          onClick={onForgotPin}
          className="mt-8 text-[14px] font-slab text-[#9b7653] opacity-70 active:opacity-100"
        >
          Забыли PIN-код?
        </button>
      )}

      {priceBlurFeatureEnabled && (
        <button
          type="button"
          onClick={() => {
            togglePricesHidden()
            if (needsMotionPermission()) {
              markMotionPermissionAsked()
              requestMotionPermission()
            }
          }}
          title={pricesHidden ? 'Показать суммы в приложении' : 'Скрыть суммы в приложении'}
          className="fixed flex items-center justify-center w-11 h-11 rounded-full bg-white border border-[#e5d9cc] text-[#9b7653] shadow-sm active:bg-[#f7f4f1] transition-colors"
          style={{ right: 'calc(env(safe-area-inset-right, 0px) + 16px)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
        >
          {pricesHidden ? <IconEyeClosed /> : <IconEye />}
        </button>
      )}
    </div>
  )
}
