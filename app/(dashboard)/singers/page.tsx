'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter,
} from '@heroui/react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { InlineNumpad } from '@/components/InlineNumpad'
import { DrawerHandle } from '@/components/DrawerHandle'
import { DiscardConfirm } from '@/components/DiscardConfirm'
import type { Member, MemberRole, EventTypeDoc, ChoirEvent } from '@/lib/types'
import { EVENT_TYPES, DEFAULT_PRICES, pricesToMap, mapToPrices, applyHalf } from '@/lib/types'
import { plural, PERSON } from '@/lib/plural'
import { splitName } from '@/lib/nameFormat'
import { PageHeader } from '@/components/PageHeader'
import { useSession } from '@/hooks/useSession'
import { notifyDataChanged, onDataChanged } from '@/lib/dataSignal'
import { RecalcConfirm } from '@/components/RecalcConfirm'

const ROLES: { value: MemberRole; label: string }[] = [
  { value: 'singer',  label: 'Певчий'  },
  { value: 'soloist', label: 'Солист'  },
  { value: 'regent',  label: 'Регент'  },
  { value: 'reader',  label: 'Чтец'    },
]

function IconScissors() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M17.3462 1.63257C17.5492 1.27151 18.0065 1.14338 18.3676 1.34638C18.7286 1.54938 18.8568 2.00664 18.6538 2.3677L12.8604 12.6718L15.5677 17.4871C16.1494 16.1697 17.4673 15.2501 19 15.2501C21.0711 15.2501 22.75 16.9291 22.75 19.0001C22.75 21.0712 21.0711 22.7501 19 22.7501C17.5771 22.7501 16.3394 21.9577 15.7039 20.7901L12 14.2022L8.29606 20.7901C7.66064 21.9577 6.42286 22.7501 5 22.7501C2.92893 22.7501 1.25 21.0712 1.25 19.0001C1.25 16.9291 2.92893 15.2501 5 15.2501C6.5327 15.2501 7.85064 16.1697 8.43226 17.4871L11.1396 12.6718L5.34624 2.3677C5.14324 2.00664 5.27138 1.54938 5.63244 1.34638C5.99349 1.14338 6.45076 1.27151 6.65376 1.63257L12 11.1415L17.3462 1.63257ZM5 21.2501C5.83538 21.2501 6.56442 20.7949 6.95257 20.1189L6.97252 20.0834C7.14938 19.7621 7.25 19.3929 7.25 19.0001C7.25 17.7575 6.24264 16.7501 5 16.7501C3.75736 16.7501 2.75 17.7575 2.75 19.0001C2.75 20.2428 3.75736 21.2501 5 21.2501ZM19 21.2501C18.1646 21.2501 17.4356 20.7949 17.0474 20.1189L17.0275 20.0834C16.8506 19.7621 16.75 19.3929 16.75 19.0001C16.75 17.7575 17.7574 16.7501 19 16.7501C20.2426 16.7501 21.25 17.7575 21.25 19.0001C21.25 20.2428 20.2426 21.2501 19 21.2501Z" fill="currentColor"/>
    </svg>
  )
}

function IconResetPrices() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.7275 6C16.7275 5.58579 16.3917 5.25 15.9775 5.25C15.5633 5.25 15.2275 5.58579 15.2275 6V7.0232C12.9877 5.46956 9.91113 5.70783 7.92796 7.73802C5.69068 10.0283 5.69068 13.7346 7.92796 16.0249C10.1748 18.325 13.8252 18.325 16.072 16.0249C17.3754 14.6907 17.9168 12.8781 17.7055 11.1509C17.6552 10.7398 17.2812 10.4472 16.87 10.4975C16.4589 10.5478 16.1663 10.9219 16.2166 11.333C16.3757 12.6337 15.9667 13.9861 14.999 14.9767C13.3407 16.6744 10.6593 16.6744 9.00097 14.9767C7.33301 13.2692 7.33301 10.4937 9.00097 8.78618C10.324 7.4318 12.298 7.15792 13.8844 7.96452H13.3258C12.9116 7.96452 12.5758 8.3003 12.5758 8.71452C12.5758 9.12873 12.9116 9.46452 13.3258 9.46452H15.9775C16.3917 9.46452 16.7275 9.12873 16.7275 8.71452V6Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M11.9426 1.25C9.63423 1.24999 7.82519 1.24998 6.4137 1.43975C4.96897 1.63399 3.82895 2.03933 2.93414 2.93414C2.03933 3.82895 1.63399 4.96897 1.43975 6.41371C1.24998 7.82519 1.24999 9.63423 1.25 11.9426V12.0574C1.24999 14.3658 1.24998 16.1748 1.43975 17.5863C1.63399 19.031 2.03933 20.1711 2.93414 21.0659C3.82895 21.9607 4.96897 22.366 6.4137 22.5603C7.82519 22.75 9.63423 22.75 11.9426 22.75H12.0574C14.3658 22.75 16.1748 22.75 17.5863 22.5603C19.031 22.366 20.1711 21.9607 21.0659 21.0659C21.9607 20.1711 22.366 19.031 22.5603 17.5863C22.75 16.1748 22.75 14.3658 22.75 12.0574V11.9426C22.75 9.63423 22.75 7.82519 22.5603 6.41371C22.366 4.96897 21.9607 3.82895 21.0659 2.93414C20.1711 2.03933 19.031 1.63399 17.5863 1.43975C16.1748 1.24998 14.3658 1.24999 12.0574 1.25H11.9426ZM3.9948 3.9948C4.56445 3.42514 5.33517 3.09825 6.61358 2.92637C7.91356 2.75159 9.62177 2.75 12 2.75C14.3782 2.75 16.0864 2.75159 17.3864 2.92637C18.6648 3.09825 19.4355 3.42514 20.0052 3.9948C20.5749 4.56445 20.9018 5.33517 21.0736 6.61358C21.2484 7.91356 21.25 9.62178 21.25 12C21.25 14.3782 21.2484 16.0864 21.0736 17.3864C20.9018 18.6648 20.5749 19.4355 20.0052 20.0052C19.4355 20.5749 18.6648 20.9018 17.3864 21.0736C16.0864 21.2484 14.3782 21.25 12 21.25C9.62177 21.25 7.91356 21.2484 6.61358 21.0736C5.33517 20.9018 4.56445 20.5749 3.9948 20.0052C3.42514 19.4355 3.09825 18.6648 2.92637 17.3864C2.75159 16.0864 2.75 14.3782 2.75 12C2.75 9.62178 2.75159 7.91356 2.92637 6.61358C3.09825 5.33517 3.42514 4.56445 3.9948 3.9948Z" fill="currentColor"/>
    </svg>
  )
}

function IconClipboardRemove() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.26279 3.25871C7.38317 2.12953 8.33887 1.25 9.5 1.25H14.5C15.6611 1.25 16.6168 2.12953 16.7372 3.25871C17.5004 3.27425 18.1602 3.31372 18.7236 3.41721C19.4816 3.55644 20.1267 3.82168 20.6517 4.34661C21.2536 4.94853 21.5125 5.7064 21.6335 6.60651C21.75 7.47348 21.75 8.5758 21.75 9.94339V16.0531C21.75 17.4207 21.75 18.523 21.6335 19.39C21.5125 20.2901 21.2536 21.048 20.6517 21.6499C20.0497 22.2518 19.2919 22.5107 18.3918 22.6317C17.5248 22.7483 16.4225 22.7483 15.0549 22.7483H8.94513C7.57754 22.7483 6.47522 22.7483 5.60825 22.6317C4.70814 22.5107 3.95027 22.2518 3.34835 21.6499C2.74643 21.048 2.48754 20.2901 2.36652 19.39C2.24996 18.523 2.24998 17.4207 2.25 16.0531V9.94339C2.24998 8.5758 2.24996 7.47348 2.36652 6.60651C2.48754 5.7064 2.74643 4.94853 3.34835 4.34661C3.87328 3.82168 4.51835 3.55644 5.27635 3.41721C5.83977 3.31372 6.49963 3.27425 7.26279 3.25871ZM7.26476 4.75913C6.54668 4.77447 5.99332 4.81061 5.54735 4.89253C4.98054 4.99664 4.65246 5.16382 4.40901 5.40727C4.13225 5.68403 3.9518 6.07261 3.85315 6.80638C3.75159 7.56173 3.75 8.56285 3.75 9.99826V15.9983C3.75 17.4337 3.75159 18.4348 3.85315 19.1901C3.9518 19.9239 4.13225 20.3125 4.40901 20.5893C4.68577 20.866 5.07435 21.0465 5.80812 21.1451C6.56347 21.2467 7.56458 21.2483 9 21.2483H15C16.4354 21.2483 17.4365 21.2467 18.1919 21.1451C18.9257 21.0465 19.3142 20.866 19.591 20.5893C19.8678 20.3125 20.0482 19.9239 20.1469 19.1901C20.2484 18.4348 20.25 17.4337 20.25 15.9983V9.99826C20.25 8.56285 20.2484 7.56173 20.1469 6.80638C20.0482 6.07261 19.8678 5.68403 19.591 5.40727C19.3475 5.16382 19.0195 4.99664 18.4527 4.89253C18.0067 4.81061 17.4533 4.77447 16.7352 4.75913C16.6067 5.87972 15.655 6.75 14.5 6.75H9.5C8.345 6.75 7.39326 5.87972 7.26476 4.75913ZM9.5 2.75C9.08579 2.75 8.75 3.08579 8.75 3.5V4.5C8.75 4.91421 9.08579 5.25 9.5 5.25H14.5C14.9142 5.25 15.25 4.91421 15.25 4.5V3.5C15.25 3.08579 14.9142 2.75 14.5 2.75H9.5ZM8.96967 11.5303C8.67678 11.2375 8.67678 10.7626 8.96967 10.4697C9.26256 10.1768 9.73744 10.1768 10.0303 10.4697L12 12.4394L13.9697 10.4697C14.2626 10.1768 14.7374 10.1768 15.0303 10.4697C15.3232 10.7626 15.3232 11.2375 15.0303 11.5304L13.0607 13.5L15.0303 15.4697C15.3232 15.7626 15.3232 16.2374 15.0303 16.5303C14.7374 16.8232 14.2625 16.8232 13.9697 16.5303L12 14.5607L10.0304 16.5303C9.73746 16.8232 9.26259 16.8232 8.96969 16.5304C8.6768 16.2375 8.6768 15.7626 8.96969 15.4697L10.9394 13.5L8.96967 11.5303Z" fill="currentColor"/>
    </svg>
  )
}

/** Отправить в архив */
function IconInboxIn({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 1.25C12.4142 1.25 12.75 1.58579 12.75 2V8.18934L14.4697 6.46967C14.7626 6.17678 15.2374 6.17678 15.5303 6.46967C15.8232 6.76256 15.8232 7.23744 15.5303 7.53033L12.5303 10.5303C12.2374 10.8232 11.7626 10.8232 11.4697 10.5303L8.46967 7.53033C8.17678 7.23744 8.17678 6.76256 8.46967 6.46967C8.76256 6.17678 9.23744 6.17678 9.53033 6.46967L11.25 8.18934V2C11.25 1.58579 11.5858 1.25 12 1.25ZM16.2536 2.05354C16.2941 1.64131 16.6612 1.34001 17.0734 1.38056C18.7643 1.54688 20.0677 1.93602 21.0659 2.93422C21.9607 3.82903 22.366 4.96906 22.5603 6.41379C22.75 7.82528 22.75 9.63432 22.75 11.9427V12.0575C22.75 12.3718 22.75 12.677 22.7495 12.9731C22.7498 12.982 22.75 12.991 22.75 13C22.75 13.0099 22.7498 13.0197 22.7494 13.0295C22.746 14.8816 22.7225 16.3794 22.5603 17.5864C22.366 19.0311 21.9607 20.1711 21.0659 21.066C20.1711 21.9608 19.031 22.3661 17.5863 22.5603C16.1748 22.7501 14.3658 22.7501 12.0574 22.7501H11.9426C9.63423 22.7501 7.82519 22.7501 6.41371 22.5603C4.96897 22.3661 3.82895 21.9608 2.93414 21.066C2.03933 20.1711 1.63399 19.0311 1.43975 17.5864C1.27747 16.3794 1.25397 14.8816 1.25057 13.0295C1.25019 13.0197 1.25 13.0099 1.25 13C1.25 12.991 1.25016 12.982 1.25047 12.9731C1.25 12.677 1.25 12.3718 1.25 12.0575V11.9427C1.24999 9.63432 1.24998 7.82528 1.43975 6.41379C1.63399 4.96906 2.03933 3.82903 2.93414 2.93422C3.93234 1.93602 5.23569 1.54688 6.92658 1.38056C7.33881 1.34001 7.70585 1.64131 7.7464 2.05354C7.78695 2.46576 7.48564 2.8328 7.07342 2.87335C5.51402 3.02674 4.62954 3.36014 3.9948 3.99488C3.42514 4.56454 3.09825 5.33526 2.92637 6.61366C2.75159 7.91364 2.75 9.62186 2.75 12.0001C2.75 12.0842 2.75 12.1675 2.75001 12.25H5.16026C5.20556 12.25 5.25031 12.25 5.29454 12.2499C6.06705 12.2491 6.67886 12.2485 7.22924 12.5016C7.77961 12.7547 8.17729 13.2197 8.67941 13.8067C8.70816 13.8403 8.73725 13.8743 8.76673 13.9087L9.37216 14.6151C10.0059 15.3544 10.1838 15.5373 10.3975 15.6356C10.6113 15.734 10.8659 15.75 11.8397 15.75H12.1603C13.1341 15.75 13.3887 15.734 13.6025 15.6356C13.8162 15.5373 13.9941 15.3544 14.6278 14.6151L15.2333 13.9087C15.2628 13.8743 15.2918 13.8403 15.3206 13.8067C15.8227 13.2197 16.2204 12.7547 16.7708 12.5016C17.3211 12.2485 17.933 12.2491 18.7055 12.2499C18.7497 12.25 18.7944 12.25 18.8397 12.25H21.25C21.25 12.1675 21.25 12.0842 21.25 12.0001C21.25 9.62186 21.2484 7.91364 21.0736 6.61366C20.9018 5.33526 20.5749 4.56454 20.0052 3.99488C19.3705 3.36014 18.486 3.02674 16.9266 2.87335C16.5144 2.8328 16.2131 2.46576 16.2536 2.05354ZM21.2465 13.75H18.8397C17.8659 13.75 17.6113 13.766 17.3975 13.8644C17.1838 13.9627 17.0059 14.1456 16.3722 14.8849L15.7667 15.5913C15.7372 15.6257 15.7082 15.6597 15.6794 15.6933C15.1773 16.2803 14.7796 16.7453 14.2292 16.9984C13.6789 17.2515 13.067 17.2509 12.2945 17.2501C12.2503 17.25 12.2056 17.25 12.1603 17.25H11.8397C11.7944 17.25 11.7497 17.25 11.7055 17.2501C10.933 17.2509 10.3211 17.2515 9.77076 16.9984C9.22039 16.7453 8.82271 16.2803 8.32059 15.6933C8.29184 15.6597 8.26275 15.6257 8.23327 15.5913L7.62784 14.8849C6.9941 14.1456 6.81622 13.9627 6.60245 13.8644C6.38869 13.766 6.13407 13.75 5.16026 13.75H2.7535C2.76294 15.2527 2.79778 16.4301 2.92637 17.3865C3.09825 18.6649 3.42514 19.4356 3.9948 20.0053C4.56445 20.5749 5.33517 20.9018 6.61358 21.0737C7.91356 21.2485 9.62178 21.2501 12 21.2501C14.3782 21.2501 16.0864 21.2485 17.3864 21.0737C18.6648 20.9018 19.4355 20.5749 20.0052 20.0053C20.5749 19.4356 20.9018 18.6649 21.0736 17.3865C21.2022 16.4301 21.2371 15.2527 21.2465 13.75Z" fill="currentColor"/>
    </svg>
  )
}

/** Вернуть из архива */
function IconInboxOut({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M11.4697 1.46967C11.7626 1.17678 12.2374 1.17678 12.5303 1.46967L15.5303 4.46967C15.8232 4.76256 15.8232 5.23744 15.5303 5.53033C15.2374 5.82322 14.7626 5.82322 14.4697 5.53033L12.75 3.81066V10C12.75 10.4142 12.4142 10.75 12 10.75C11.5858 10.75 11.25 10.4142 11.25 10V3.81066L9.53033 5.53033C9.23744 5.82322 8.76256 5.82322 8.46967 5.53033C8.17678 5.23744 8.17678 4.76256 8.46967 4.46967L11.4697 1.46967ZM16.2536 2.05345C16.2941 1.64122 16.6612 1.33992 17.0734 1.38047C18.7643 1.54679 20.0677 1.93593 21.0659 2.93414C21.9607 3.82895 22.366 4.96897 22.5603 6.41371C22.75 7.82519 22.75 9.63423 22.75 11.9426V12.0574C22.75 12.3718 22.75 12.6769 22.7495 12.9731C22.7498 12.982 22.75 12.991 22.75 13C22.75 13.0099 22.7498 13.0197 22.7494 13.0296C22.746 14.8816 22.7225 16.3793 22.5603 17.5863C22.366 19.031 21.9607 20.1711 21.0659 21.0659C20.1711 21.9607 19.031 22.366 17.5863 22.5603C16.1748 22.75 14.3658 22.75 12.0574 22.75H11.9426C9.63423 22.75 7.82519 22.75 6.41371 22.5603C4.96897 22.366 3.82895 21.9607 2.93414 21.0659C2.03933 20.1711 1.63399 19.031 1.43975 17.5863C1.27747 16.3793 1.25397 14.8816 1.25057 13.0295C1.25019 13.0197 1.25 13.0099 1.25 13C1.25 12.991 1.25016 12.982 1.25047 12.9731C1.25 12.6769 1.25 12.3718 1.25 12.0574V11.9426C1.24999 9.63423 1.24998 7.82519 1.43975 6.41371C1.63399 4.96897 2.03933 3.82895 2.93414 2.93414C3.93234 1.93593 5.23569 1.54679 6.92658 1.38047C7.33881 1.33992 7.70585 1.64122 7.7464 2.05345C7.78695 2.46567 7.48564 2.83272 7.07342 2.87326C5.51402 3.02665 4.62954 3.36005 3.9948 3.9948C3.42514 4.56445 3.09825 5.33517 2.92637 6.61358C2.75159 7.91356 2.75 9.62178 2.75 12C2.75 12.0842 2.75 12.1675 2.75001 12.25H5.16026C5.20556 12.25 5.25031 12.25 5.29454 12.2499C6.06705 12.2491 6.67886 12.2485 7.22924 12.5016C7.77961 12.7547 8.17729 13.2197 8.67941 13.8067C8.70816 13.8403 8.73725 13.8743 8.76673 13.9087L9.37216 14.6151C10.0059 15.3544 10.1838 15.5373 10.3975 15.6356C10.6113 15.734 10.8659 15.75 11.8397 15.75H12.1603C13.1341 15.75 13.3887 15.734 13.6025 15.6356C13.8162 15.5373 13.9941 15.3544 14.6278 14.6151L15.2333 13.9087C15.2628 13.8743 15.2918 13.8403 15.3206 13.8067C15.8227 13.2197 16.2204 12.7547 16.7708 12.5016C17.3211 12.2485 17.933 12.2491 18.7055 12.2499C18.7497 12.25 18.7944 12.25 18.8397 12.25H21.25C21.25 12.1675 21.25 12.0842 21.25 12C21.25 9.62178 21.2484 7.91356 21.0736 6.61358C20.9018 5.33517 20.5749 4.56445 20.0052 3.9948C19.3705 3.36005 18.486 3.02665 16.9266 2.87326C16.5144 2.83272 16.2131 2.46567 16.2536 2.05345ZM21.2465 13.75H18.8397C17.8659 13.75 17.6113 13.766 17.3975 13.8644C17.1838 13.9627 17.0059 14.1456 16.3722 14.8849L15.7667 15.5913C15.7372 15.6257 15.7082 15.6597 15.6794 15.6933C15.1773 16.2803 14.7796 16.7453 14.2292 16.9984C13.6789 17.2515 13.067 17.2509 12.2945 17.2501C12.2503 17.25 12.2056 17.25 12.1603 17.25H11.8397C11.7944 17.25 11.7497 17.25 11.7055 17.2501C10.933 17.2509 10.3211 17.2515 9.77076 16.9984C9.22039 16.7453 8.82271 16.2803 8.32059 15.6933C8.29184 15.6597 8.26275 15.6257 8.23327 15.5913L7.62784 14.8849C6.9941 14.1456 6.81622 13.9627 6.60245 13.8644C6.38869 13.766 6.13407 13.75 5.16026 13.75H2.7535C2.76294 15.2526 2.79778 16.43 2.92637 17.3864C3.09825 18.6648 3.42514 19.4355 3.9948 20.0052C4.56445 20.5749 5.33517 20.9018 6.61358 21.0736C7.91356 21.2484 9.62178 21.25 12 21.25C14.3782 21.25 16.0864 21.2484 17.3864 21.0736C18.6648 20.9018 19.4355 20.5749 20.0052 20.0052C20.5749 19.4355 20.9018 18.6648 21.0736 17.3864C21.2022 16.43 21.2371 15.2526 21.2465 13.75Z" fill="currentColor"/>
    </svg>
  )
}

/** Открыть архив (посмотреть) */
function IconInboxLine({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M11.9426 1.25H12.0574C14.3658 1.24999 16.1748 1.24998 17.5863 1.43975C19.031 1.63399 20.1711 2.03933 21.0659 2.93414C21.9607 3.82895 22.366 4.96897 22.5603 6.41371C22.75 7.82519 22.75 9.63423 22.75 11.9426V12.0574C22.75 12.3718 22.75 12.6769 22.7495 12.9731C22.7498 12.982 22.75 12.991 22.75 13C22.75 13.0099 22.7498 13.0197 22.7494 13.0296C22.746 14.8816 22.7225 16.3793 22.5603 17.5863C22.366 19.031 21.9607 20.1711 21.0659 21.0659C20.1711 21.9607 19.031 22.366 17.5863 22.5603C16.1748 22.75 14.3658 22.75 12.0574 22.75H11.9426C9.63423 22.75 7.82519 22.75 6.41371 22.5603C4.96897 22.366 3.82895 21.9607 2.93414 21.0659C2.03933 20.1711 1.63399 19.031 1.43975 17.5863C1.27747 16.3793 1.25397 14.8816 1.25057 13.0295C1.25019 13.0197 1.25 13.0099 1.25 13C1.25 12.991 1.25016 12.982 1.25047 12.9731C1.25 12.6769 1.25 12.3718 1.25 12.0574V11.9426C1.24999 9.63423 1.24998 7.82519 1.43975 6.41371C1.63399 4.96897 2.03933 3.82895 2.93414 2.93414C3.82895 2.03933 4.96897 1.63399 6.41371 1.43975C7.82519 1.24998 9.63423 1.24999 11.9426 1.25ZM2.7535 13.75C2.76294 15.2526 2.79778 16.43 2.92637 17.3864C3.09825 18.6648 3.42514 19.4355 3.9948 20.0052C4.56445 20.5749 5.33517 20.9018 6.61358 21.0736C7.91356 21.2484 9.62178 21.25 12 21.25C14.3782 21.25 16.0864 21.2484 17.3864 21.0736C18.6648 20.9018 19.4355 20.5749 20.0052 20.0052C20.5749 19.4355 20.9018 18.6648 21.0736 17.3864C21.2022 16.43 21.2371 15.2526 21.2465 13.75H18.8397C17.8659 13.75 17.6113 13.766 17.3975 13.8644C17.1838 13.9627 17.0059 14.1456 16.3722 14.8849L15.7667 15.5913C15.7372 15.6257 15.7082 15.6597 15.6794 15.6933C15.1773 16.2803 14.7796 16.7453 14.2292 16.9984C13.6789 17.2515 13.067 17.2509 12.2945 17.2501C12.2503 17.25 12.2056 17.25 12.1603 17.25H11.8397C11.7944 17.25 11.7497 17.25 11.7055 17.2501C10.933 17.2509 10.3211 17.2515 9.77076 16.9984C9.22039 16.7453 8.82271 16.2803 8.32059 15.6933C8.29184 15.6597 8.26275 15.6257 8.23327 15.5913L7.62784 14.8849C6.9941 14.1456 6.81622 13.9627 6.60245 13.8644C6.38869 13.766 6.13407 13.75 5.16026 13.75H2.7535ZM21.25 12.25H18.8397C18.7944 12.25 18.7497 12.25 18.7055 12.2499C17.933 12.2491 17.3211 12.2485 16.7708 12.5016C16.2204 12.7547 15.8227 13.2197 15.3206 13.8067C15.2918 13.8403 15.2628 13.8743 15.2333 13.9087L14.6278 14.6151C13.9941 15.3544 13.8162 15.5373 13.6025 15.6356C13.3887 15.734 13.1341 15.75 12.1603 15.75H11.8397C10.8659 15.75 10.6113 15.734 10.3975 15.6356C10.1838 15.5373 10.0059 15.3544 9.37216 14.6151L8.76673 13.9087C8.73725 13.8743 8.70816 13.8403 8.67941 13.8067C8.17729 13.2197 7.77961 12.7547 7.22924 12.5016C6.67886 12.2485 6.06705 12.2491 5.29454 12.2499C5.25031 12.25 5.20556 12.25 5.16026 12.25H2.75001C2.75 12.1675 2.75 12.0842 2.75 12C2.75 9.62178 2.75159 7.91356 2.92637 6.61358C3.09825 5.33517 3.42514 4.56445 3.9948 3.9948C4.56445 3.42514 5.33517 3.09825 6.61358 2.92637C7.91356 2.75159 9.62178 2.75 12 2.75C14.3782 2.75 16.0864 2.75159 17.3864 2.92637C18.6648 3.09825 19.4355 3.42514 20.0052 3.9948C20.5749 4.56445 20.9018 5.33517 21.0736 6.61358C21.2484 7.91356 21.25 9.62178 21.25 12C21.25 12.0842 21.25 12.1675 21.25 12.25ZM7.25 7C7.25 6.58579 7.58579 6.25 8 6.25H16C16.4142 6.25 16.75 6.58579 16.75 7C16.75 7.41421 16.4142 7.75 16 7.75H8C7.58579 7.75 7.25 7.41421 7.25 7ZM9.25 10.5C9.25 10.0858 9.58579 9.75 10 9.75H14C14.4142 9.75 14.75 10.0858 14.75 10.5C14.75 10.9142 14.4142 11.25 14 11.25H10C9.58579 11.25 9.25 10.9142 9.25 10.5Z" fill="currentColor"/>
    </svg>
  )
}

/** Отмена выбора (крестик) */
function IconClose({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6.34351 6.34338C6.73404 5.95286 7.36721 5.95286 7.75773 6.34338L12.0006 10.5862L16.2435 6.34338C16.634 5.95286 17.2672 5.95286 17.6577 6.34338C18.0482 6.73391 18.0482 7.36707 17.6577 7.7576L13.4148 12.0004L17.6577 16.2433C18.0482 16.6338 18.0482 17.267 17.6577 17.6575C17.2672 18.048 16.634 18.048 16.2435 17.6575L12.0006 13.4146L7.75773 17.6575C7.36721 18.048 6.73404 18.048 6.34351 17.6575C5.95299 17.267 5.95299 16.6338 6.34351 16.2433L10.5864 12.0004L6.34351 7.7576C5.95299 7.36707 5.95299 6.73391 6.34351 6.34338Z" fill="currentColor"/>
    </svg>
  )
}

/** Пояснение в модалке подтверждения архивации */
function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75ZM1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12Z" fill="currentColor"/>
      <path d="M12 11C12.4142 11 12.75 11.3358 12.75 11.75V16.25C12.75 16.6642 12.4142 17 12 17C11.5858 17 11.25 16.6642 11.25 16.25V11.75C11.25 11.3358 11.5858 11 12 11Z" fill="currentColor"/>
      <path d="M13 8.25C13 8.80228 12.5523 9.25 12 9.25C11.4477 9.25 11 8.80228 11 8.25C11 7.69772 11.4477 7.25 12 7.25C12.5523 7.25 13 7.69772 13 8.25Z" fill="currentColor"/>
    </svg>
  )
}

/** Возвращает цены по умолчанию из документов типов выходов (база данных) */
function buildDefaultPrices(role: MemberRole, docs: EventTypeDoc[]): Record<string, number> {
  const out: Record<string, number> = {}
  docs.forEach((d) => { out[d.name] = d.prices[role] ?? 0 })
  return out
}

export default function SingersPage() {
  const { session } = useSession()
  const isWeekday = session?.choirType === 'weekday'

  const [members, setMembers] = useState<Member[]>([])
  const [eventTypeDocs, setEventTypeDocs] = useState<EventTypeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Подтверждение возврата из архива
  const [restoreTarget, setRestoreTarget] = useState<Member | null>(null)
  const [restoring, setRestoring] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [patronymic, setPatronymic] = useState('')
  const [role, setRole] = useState<MemberRole>('singer')
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [disabledEventTypes, setDisabledEventTypes] = useState<string[]>([])
  const [halvedEventTypes, setHalvedEventTypes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [activeNumpad, setActiveNumpad] = useState<string | null>(null)
  const [recalcNotice, setRecalcNotice] = useState('')
  // Кого пересчитывать после смены цены — спрашиваем сразу после сохранения
  const [recalcMemberId, setRecalcMemberId] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)

  // Архивация — выбор нескольких певчих чекбоксами и один запрос на подтверждение
  const [archiveViewOpen, setArchiveViewOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [archivingBulk, setArchivingBulk] = useState(false)
  const [archiveInfoOpen, setArchiveInfoOpen] = useState(false)
  // Кто из выбранных уже отмечен в табеле текущего месяца — предупреждаем перед архивацией
  const [currentMonthMemberIds, setCurrentMonthMemberIds] = useState<Set<string>>(new Set())
  const [singleArchiveWarning, setSingleArchiveWarning] = useState(false)

  // Совпадение по ФИО с уже существующим певчим (активным или в архиве) при сохранении карточки
  const [duplicateConfirm, setDuplicateConfirm] = useState<Member[] | null>(null)

  // Снимок формы на момент открытия — для определения несохранённых изменений
  const formSnapshot = useRef('')
  function serializeForm(
    n: string, p: string, r: MemberRole,
    pr: Record<string, number>, dis: string[], hal: string[],
  ): string {
    return JSON.stringify({
      n: n.trim(), p: p.trim(), r, pr,
      dis: [...dis].sort(), hal: [...hal].sort(),
    })
  }
  const isFormDirty = () =>
    formSnapshot.current !== serializeForm(name, patronymic, role, prices, disabledEventTypes, halvedEventTypes)

  // Список типов выходов для редактора цен — из БД для обоих хоров, константа как запасной вариант
  const priceEventTypes: string[] = eventTypeDocs.length > 0
    ? eventTypeDocs.map((d) => d.name)
    : isWeekday ? [] : [...EVENT_TYPES]

  const load = useCallback(async () => {
    setLoading(true)
    const [mbRes, etRes] = await Promise.all([
      fetch('/api/members'),
      fetch('/api/event-types'),
    ])
    if (mbRes.ok) setMembers(await mbRes.json())
    if (etRes.ok) setEventTypeDocs(await etRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => onDataChanged(load), [load])

  function openNew() {
    setEditing(null)
    setName('')
    setPatronymic('')
    setRole('singer')
    const pr = buildDefaultPrices('singer', eventTypeDocs)
    setPrices(pr)
    setDisabledEventTypes([])
    setHalvedEventTypes([])
    setActiveNumpad(null)
    formSnapshot.current = serializeForm('', '', 'singer', pr, [], [])
    setDrawerOpen(true)
  }

  /** Слепок цен на момент открытия карточки — с ним сверяемся при сохранении */
  const pricesOnOpen = useRef('')

  function openEdit(m: Member) {
    setEditing(m)
    setName(m.name)
    setPatronymic(m.patronymic || '')
    setRole(m.role)
    const stored = pricesToMap(m.defaultPrices)
    const pr = { ...buildDefaultPrices(m.role, eventTypeDocs), ...stored }
    setPrices(pr)
    pricesOnOpen.current = JSON.stringify([pr, m.halvedEventTypes ?? [], m.role])
    const dis = m.disabledEventTypes ?? []
    const hal = m.halvedEventTypes ?? []
    setDisabledEventTypes(dis)
    setHalvedEventTypes(hal)
    setActiveNumpad(null)
    formSnapshot.current = serializeForm(m.name, m.patronymic || '', m.role, pr, dis, hal)
    setDrawerOpen(true)
  }

  function requestCloseDrawer() {
    if (isFormDirty()) { setDiscardOpen(true); return true }
    return false
  }

  function handleRoleChange(r: MemberRole) {
    setRole(r)
    setPrices(buildDefaultPrices(r, eventTypeDocs))
    setDisabledEventTypes([])
    setHalvedEventTypes([])
  }

  function toggleDisabledEventType(t: string) {
    setDisabledEventTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }

  function toggleHalvedEventType(t: string) {
    setHalvedEventTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }

  /**
   * Звёздочка у чтеца: он подставляется в новый выход сам.
   * Звезда одна на хор — назначение нового снимает её с прежнего.
   */
  async function togglePreferredReader(target: Member) {
    const next = !target.isPreferredReader
    const others = next
      ? members.filter((m) => m.role === 'reader' && m._id !== target._id && m.isPreferredReader)
      : []

    setMembers((prev) => prev.map((m) =>
      m._id === target._id ? { ...m, isPreferredReader: next }
        : others.some((o) => o._id === m._id) ? { ...m, isPreferredReader: false }
        : m))

    await Promise.all([
      fetch(`/api/members/${target._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPreferredReader: next }),
      }),
      ...others.map((o) => fetch(`/api/members/${o._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPreferredReader: false }),
      })),
    ])
    load()
  }

  /** Совпадения по ФИО среди уже существующих (активных и архивных) */
  function findNameDuplicates(): Member[] {
    const n = name.trim().toLowerCase()
    if (!n) return []
    return members.filter((m) => m._id !== editing?._id && m.name.trim().toLowerCase() === n)
  }

  async function handleSave() {
    if (!name.trim()) return
    if (!editing) {
      const dups = findNameDuplicates()
      if (dups.length > 0) {
        setDuplicateConfirm(dups)
        return
      }
    }
    await doSave()
  }

  async function doSave() {
    setSaving(true)
    // Сохраняем только личные отклонения от тарифов типов выходов.
    // Если цена совпадает с тарифом — не храним, тогда изменение тарифа применится автоматически.
    const defaults = buildDefaultPrices(role, eventTypeDocs)
    const overrides = Object.fromEntries(
      Object.entries(prices).filter(([t, p]) => p !== (defaults[t] ?? 0))
    )
    const body = {
      name: name.trim(),
      patronymic: patronymic.trim(),
      role,
      defaultPrices: mapToPrices(overrides),
      regentMultiplier: 1,
      disabledEventTypes,
      halvedEventTypes,
    }
    if (editing) {
      const res = await fetch(`/api/members/${editing._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      // Цены изменились — спросим, обновлять ли уже созданные выходы
      if (res.ok && JSON.stringify([prices, halvedEventTypes, role]) !== pricesOnOpen.current) {
        setRecalcMemberId(editing._id)
      }
    } else {
      await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    setSaving(false)
    setDrawerOpen(false)
    load()
    notifyDataChanged()
  }

  async function confirmSaveDespiteDuplicate() {
    setDuplicateConfirm(null)
    await doSave()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch(`/api/members/${deleteTarget._id}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteTarget(null)
    load()
    notifyDataChanged()
  }

  /**
   * Архив — для тех, кто перестал ходить, но может вернуться. В отличие от
   * удаления, ничего не стирает: старые выходы, где человек уже отмечен,
   * не меняются, он просто не предлагается при добавлении новых.
   */
  function toggleSelectMode() {
    setSelectMode((v) => !v)
    setSelectedIds(new Set())
  }

  /** Кнопка «Добавить в архив» внутри дравера архива: закрывает дравер и включает выбор чекбоксами */
  function startBulkArchive() {
    setArchiveViewOpen(false)
    setSelectMode(true)
    setSelectedIds(new Set())
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /** _id тех, кто уже отмечен в табеле текущего месяца — предупреждаем перед архивацией */
  async function fetchCurrentMonthMemberIds(): Promise<Set<string>> {
    const month = new Date().toLocaleDateString('sv-SE').slice(0, 7)
    const res = await fetch(`/api/events?month=${month}`)
    if (!res.ok) return new Set()
    const events: ChoirEvent[] = await res.json()
    const ids = new Set<string>()
    events.forEach((ev) => ev.attendances.forEach((a) => ids.add(a.memberId)))
    return ids
  }

  async function openBulkArchiveConfirm() {
    setCurrentMonthMemberIds(await fetchCurrentMonthMemberIds())
    setArchiveConfirmOpen(true)
  }

  async function confirmBulkArchive() {
    setArchivingBulk(true)
    await Promise.all([...selectedIds].map((id) =>
      fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })
    ))
    setArchivingBulk(false)
    setArchiveConfirmOpen(false)
    setSelectMode(false)
    setSelectedIds(new Set())
    load()
    notifyDataChanged()
  }

  /** Кнопка архива в самой карточке редактирования — отправляет в архив только этого певчего */
  async function archiveSingleFromEdit() {
    if (!editing) return
    await fetch(`/api/members/${editing._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })
    setSingleArchiveWarning(false)
    setDrawerOpen(false)
    load()
    notifyDataChanged()
  }

  /** Клик по иконке архива в карточке — если есть выходы в этом месяце, сперва предупреждаем */
  async function handleArchiveClickFromEdit() {
    if (!editing) return
    const monthIds = await fetchCurrentMonthMemberIds()
    if (monthIds.has(editing._id)) {
      setSingleArchiveWarning(true)
    } else {
      await archiveSingleFromEdit()
    }
  }

  async function confirmRestore() {
    if (!restoreTarget) return
    setRestoring(true)
    await fetch(`/api/members/${restoreTarget._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true }),
    })
    setRestoring(false)
    setRestoreTarget(null)
    setArchiveViewOpen(false)
    load()
    notifyDataChanged()
  }

  const choirLabel = session?.choirType === 'festive' ? 'Певчие праздничного хора' : 'Певчие буднего хора'

  return (
    <div className="max-w-lg mx-auto">
      <RecalcConfirm
        open={recalcMemberId !== null}
        scope="цены этого певчего"
        onClose={() => setRecalcMemberId(null)}
        onConfirm={async (months) => {
          const res = await fetch('/api/recalc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId: recalcMemberId, ...months }),
          })
          const data = res.ok ? await res.json() : { updated: 0 }
          load()
          notifyDataChanged()
          return data.updated ?? 0
        }}
      />

      {recalcNotice && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-xl shadow-lg text-white text-sm font-slab font-semibold"
             style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}>
          {recalcNotice}
        </div>
      )}
      <PageHeader
        title={choirLabel}
        subtitle={loading ? '' : `${members.filter(m => m.isActive !== false).length} ${plural(members.filter(m => m.isActive !== false).length, PERSON)}`}
        right={
          selectMode ? (
            <div className="flex items-center gap-2 -mt-2">
              <button
                onClick={toggleSelectMode}
                className="w-10 h-10 rounded-xl border border-warm-200 bg-white text-warm-700 flex items-center justify-center active:bg-warm-50 transition-colors"
                title="Отмена"
              >
                <IconClose size={22} />
              </button>
              <button
                onClick={openBulkArchiveConfirm}
                disabled={selectedIds.size === 0}
                className="relative w-10 h-10 rounded-xl text-white disabled:opacity-40 flex items-center justify-center"
                style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}
                title="ОК"
              >
                <IconInboxIn size={22} />
                {selectedIds.size > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {selectedIds.size}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 -mt-2">
              <button
                onClick={() => setArchiveViewOpen(true)}
                className="w-10 h-10 rounded-xl border border-warm-200 bg-white text-warm-700 flex items-center justify-center active:bg-warm-50 transition-colors"
                title="Архив"
              >
                <IconInboxLine size={24} />
              </button>
              <button
                onClick={openNew}
                className="w-10 h-10 rounded-xl border border-warm-200 bg-white text-warm-700 flex items-center justify-center active:bg-warm-50 transition-colors"
                title="Добавить певчего"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M7.25013 6C7.25013 3.37665 9.37678 1.25 12.0001 1.25C14.6235 1.25 16.7501 3.37665 16.7501 6C16.7501 8.62335 14.6235 10.75 12.0001 10.75C9.37678 10.75 7.25013 8.62335 7.25013 6ZM12.0001 2.75C10.2052 2.75 8.75013 4.20507 8.75013 6C8.75013 7.79493 10.2052 9.25 12.0001 9.25C13.7951 9.25 15.2501 7.79493 15.2501 6C15.2501 4.20507 13.7951 2.75 12.0001 2.75Z" fill="currentColor"/>
                  <path d="M18.0001 13.9167C18.4143 13.9167 18.7501 14.2524 18.7501 14.6667V15.25H19.3333C19.7475 15.25 20.0833 15.5858 20.0833 16C20.0833 16.4142 19.7475 16.75 19.3333 16.75H18.7501V17.3333C18.7501 17.7475 18.4143 18.0833 18.0001 18.0833C17.5859 18.0833 17.2501 17.7475 17.2501 17.3333V16.75H16.6666C16.2524 16.75 15.9166 16.4142 15.9166 16C15.9166 15.5858 16.2524 15.25 16.6666 15.25H17.2501V14.6667C17.2501 14.2524 17.5859 13.9167 18.0001 13.9167Z" fill="currentColor"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M14.7748 12.5129C13.9021 12.3421 12.9686 12.25 12.0001 12.25C9.68658 12.25 7.55506 12.7759 5.97558 13.6643C4.41962 14.5396 3.25013 15.8661 3.25013 17.5L3.25007 17.602C3.24894 18.7638 3.24752 20.222 4.52655 21.2635C5.15602 21.7761 6.03661 22.1406 7.22634 22.3815C8.41939 22.6229 9.97436 22.75 12.0001 22.75C14.8682 22.75 16.81 22.4961 18.1197 22.0085C19.2986 21.5697 19.9974 20.9266 20.3705 20.1172C21.7928 19.2966 22.7501 17.7601 22.7501 16C22.7501 13.3766 20.6235 11.25 18.0001 11.25C16.755 11.25 15.6218 11.7291 14.7748 12.5129ZM6.71098 14.9717C5.37151 15.7251 4.75013 16.6487 4.75013 17.5C4.75013 18.8078 4.79045 19.544 5.47372 20.1004C5.84425 20.4022 6.46366 20.6967 7.52392 20.9113C8.58087 21.1252 10.0259 21.25 12.0001 21.25C14.5781 21.25 16.2402 21.0366 17.311 20.7004C15.0142 20.3666 13.2501 18.3893 13.2501 16C13.2501 15.2322 13.4323 14.5069 13.7558 13.865C13.1941 13.79 12.6062 13.75 12.0001 13.75C9.89541 13.75 8.02693 14.2315 6.71098 14.9717ZM14.7501 16C14.7501 14.2051 16.2052 12.75 18.0001 12.75C19.7951 12.75 21.2501 14.2051 21.2501 16C21.2501 17.7949 19.7951 19.25 18.0001 19.25C16.2052 19.25 14.7501 17.7949 14.7501 16Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          )
        }
      />

      <div className="px-2">
        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" color="#9b7653" /></div>
        ) : (
          <div className="warm-card overflow-hidden">
            <table className="warm-table">
              <thead>
                <tr>
                  {selectMode && <th style={{ width: '36px' }} />}
                  <th className="text-left">Фамилия</th>
                  <th className="text-center">Имя</th>
                  {!selectMode && <th style={{ width: '72px' }} />}
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-warm-400 py-8 font-slab">
                      Певчих нет — добавьте первого
                    </td>
                  </tr>
                ) : (() => {
                  const activeMembers = members.filter(m => m.isActive !== false)
                  const singerList = activeMembers.filter(m => m.role !== 'reader')
                  const readerList = activeMembers.filter(m => m.role === 'reader')

                  const EditDeleteBtns = ({ m }: { m: Member }) => (
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(m)} className="w-7 h-7 rounded-lg bg-warm-100 text-warm-600 flex items-center justify-center active:bg-warm-200 transition-colors" title="Редактировать">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M14.7566 2.62145C16.5852 0.792851 19.55 0.792851 21.3786 2.62145C23.2072 4.45005 23.2072 7.41479 21.3786 9.24339L11.8933 18.7287C11.3514 19.2706 11.0323 19.5897 10.6774 19.8665C10.2592 20.1927 9.80655 20.4725 9.32766 20.7007C8.92136 20.8943 8.49334 21.037 7.76623 21.2793L4.43511 22.3897L3.63303 22.6571C2.98247 22.8739 2.26522 22.7046 1.78032 22.2197C1.29542 21.7348 1.1261 21.0175 1.34296 20.367L2.72068 16.2338C2.96303 15.5067 3.10568 15.0787 3.29932 14.6724C3.52755 14.1935 3.80727 13.7409 4.13354 13.3226C4.41035 12.9677 4.72939 12.6487 5.27137 12.1067L14.7566 2.62145ZM4.40051 20.8201L7.24203 19.8729C8.03314 19.6092 8.36927 19.4958 8.68233 19.3466C9.06287 19.1653 9.42252 18.943 9.75492 18.6837C10.0284 18.4704 10.2801 18.2205 10.8698 17.6308L18.4393 10.0614C17.6506 9.78321 16.6346 9.26763 15.6835 8.31651C14.7324 7.36538 14.2168 6.34939 13.9387 5.56075L6.36917 13.1302C5.77951 13.7199 5.52959 13.9716 5.3163 14.2451C5.05704 14.5775 4.83476 14.9371 4.65341 15.3177C4.50421 15.6307 4.3908 15.9669 4.12709 16.758L3.17992 19.5995L4.40051 20.8201ZM15.1554 4.34404C15.1896 4.519 15.2474 4.75684 15.3438 5.03487C15.561 5.66083 15.9712 6.48288 16.7442 7.25585C17.5171 8.02881 18.3392 8.43903 18.9651 8.6562C19.2432 8.75266 19.481 8.81046 19.656 8.84466L20.3179 8.18272C21.5607 6.93991 21.5607 4.92492 20.3179 3.68211C19.0751 2.4393 17.0601 2.4393 15.8173 3.68211L15.1554 4.34404Z" fill="currentColor"/></svg>
                      </button>
                      <button onClick={() => setDeleteTarget(m)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center active:bg-red-100 transition-colors" title="Удалить">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2.75C11.0215 2.75 10.1871 3.37503 9.87787 4.24993C9.73983 4.64047 9.31134 4.84517 8.9208 4.70713C8.53026 4.56909 8.32557 4.1406 8.46361 3.75007C8.97804 2.29459 10.3661 1.25 12 1.25C13.634 1.25 15.022 2.29459 15.5365 3.75007C15.6745 4.1406 15.4698 4.56909 15.0793 4.70713C14.6887 4.84517 14.2602 4.64047 14.1222 4.24993C13.813 3.37503 12.9785 2.75 12 2.75Z" fill="currentColor"/><path d="M2.75 6C2.75 5.58579 3.08579 5.25 3.5 5.25H20.5001C20.9143 5.25 21.2501 5.58579 21.2501 6C21.2501 6.41421 20.9143 6.75 20.5001 6.75H3.5C3.08579 6.75 2.75 6.41421 2.75 6Z" fill="currentColor"/><path d="M5.91508 8.45011C5.88753 8.03681 5.53015 7.72411 5.11686 7.75166C4.70356 7.77921 4.39085 8.13659 4.41841 8.54989L4.88186 15.5016C4.96735 16.7844 5.03641 17.8205 5.19838 18.6336C5.36678 19.4789 5.6532 20.185 6.2448 20.7384C6.83639 21.2919 7.55994 21.5307 8.41459 21.6425C9.23663 21.75 10.2751 21.75 11.5607 21.75H12.4395C13.7251 21.75 14.7635 21.75 15.5856 21.6425C16.4402 21.5307 17.1638 21.2919 17.7554 20.7384C18.347 20.185 18.6334 19.4789 18.8018 18.6336C18.9637 17.8205 19.0328 16.7844 19.1183 15.5016L19.5818 8.54989C19.6093 8.13659 19.2966 7.77921 18.8833 7.75166C18.47 7.72411 18.1126 8.03681 18.0851 8.45011L17.6251 15.3492C17.5353 16.6971 17.4712 17.6349 17.3307 18.3405C17.1943 19.025 17.004 19.3873 16.7306 19.6431C16.4572 19.8988 16.083 20.0647 15.391 20.1552C14.6776 20.2485 13.7376 20.25 12.3868 20.25H11.6134C10.2626 20.25 9.32255 20.2485 8.60915 20.1552C7.91715 20.0647 7.54299 19.8988 7.26957 19.6431C6.99616 19.3873 6.80583 19.025 6.66948 18.3405C6.52891 17.6349 6.46488 16.6971 6.37503 15.3492L5.91508 8.45011Z" fill="currentColor"/><path d="M9.42546 10.2537C9.83762 10.2125 10.2051 10.5132 10.2464 10.9254L10.7464 15.9254C10.7876 16.3375 10.4869 16.7051 10.0747 16.7463C9.66256 16.7875 9.29502 16.4868 9.25381 16.0746L8.75381 11.0746C8.71259 10.6625 9.0133 10.2949 9.42546 10.2537Z" fill="currentColor"/><path d="M15.2464 11.0746C15.2876 10.6625 14.9869 10.2949 14.5747 10.2537C14.1626 10.2125 13.795 10.5132 13.7538 10.9254L13.2538 15.9254C13.2126 16.3375 13.5133 16.7051 13.9255 16.7463C14.3376 16.7875 14.7051 16.4868 14.7464 16.0746L15.2464 11.0746Z" fill="currentColor"/></svg>
                      </button>
                    </div>
                  )

                  const Checkbox = ({ id }: { id: string }) => (
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        selectedIds.has(id) ? 'border-transparent text-white' : 'border-warm-300 bg-white'
                      }`}
                      style={selectedIds.has(id) ? { background: 'linear-gradient(to right, #bd9673, #7d5e42)' } : {}}
                    >
                      {selectedIds.has(id) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12.5L10 17L19 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  )

                  return <>
                    {singerList.map((m) => {
                      const { lastName, firstName } = splitName(m.name)
                      return (
                        <tr key={m._id} onClick={() => selectMode && toggleSelected(m._id)} className={selectMode ? 'cursor-pointer' : ''}>
                          {selectMode && <td><Checkbox id={m._id} /></td>}
                          <td><span className="font-slab font-semibold text-warm-900">{lastName}</span></td>
                          <td className="text-center">
                            <span className="font-slab text-warm-700">
                              {firstName}{m.patronymic ? <span className="text-warm-500"> {m.patronymic}.</span> : null}
                            </span>
                          </td>
                          {!selectMode && <td><EditDeleteBtns m={m} /></td>}
                        </tr>
                      )
                    })}
                    {readerList.length > 0 && <>
                      <tr className="no-hover">
                        <td colSpan={3} className="px-4 py-1 bg-warm-50">
                          <span className="text-[10px] font-slab font-bold uppercase tracking-widest" style={{ color: '#7d5e42' }}>Чтец</span>
                        </td>
                      </tr>
                      {readerList.map((m) => {
                        const { lastName, firstName } = splitName(m.name)
                        return (
                          <tr key={m._id} onClick={() => selectMode && toggleSelected(m._id)} className={selectMode ? 'cursor-pointer' : ''}>
                            {selectMode && <td><Checkbox id={m._id} /></td>}
                            <td>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => { e.stopPropagation(); togglePreferredReader(m) }}
                                  title={m.isPreferredReader
                                    ? 'Подставляется в новый выход. Нажмите, чтобы убрать'
                                    : 'Сделать чтецом по умолчанию'}
                                  className="shrink-0 w-6 h-6 flex items-center justify-center"
                                  style={{ color: m.isPreferredReader ? '#e0a23c' : '#d4c0ac' }}
                                  disabled={selectMode}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24"
                                    fill={m.isPreferredReader ? 'currentColor' : 'none'}
                                    stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                                    <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L12 16.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85L12 3.5z" />
                                  </svg>
                                </button>
                                <span className="font-slab font-semibold text-warm-900">{lastName}</span>
                              </div>
                            </td>
                            <td className="text-center">
                              <span className="font-slab text-warm-700">
                                {firstName}{m.patronymic ? <span className="text-warm-500"> {m.patronymic}.</span> : null}
                              </span>
                            </td>
                            {!selectMode && <td><EditDeleteBtns m={m} /></td>}
                          </tr>
                        )
                      })}
                    </>}
                  </>
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer: добавить / редактировать певчего */}
      <Drawer
        isOpen={drawerOpen}
        onOpenChange={(open) => { if (open) return; if (requestCloseDrawer()) return; setDrawerOpen(false) }}
        placement="bottom"
        scrollBehavior="inside"
        /* Пока висит подтверждение сброса цен — клик вне Drawer его не закрывает */
        isDismissable={!showResetConfirm && !discardOpen}
        classNames={{
          base: 'bg-white rounded-t-2xl max-h-[92dvh] flex flex-col overflow-hidden drawer-sheet',
          header: 'border-b border-warm-200 px-4 pt-2 pb-3 shrink-0',
          body: 'overflow-y-auto px-4 py-4',
          footer: 'border-t border-warm-200 bg-white px-4 py-3 shrink-0',
          closeButton: 'hidden',
        }}
      >
        <DrawerContent>
          {(closeDrawer) => (
            <>
              <DrawerHeader className="flex-col gap-0">
                <DrawerHandle onClose={closeDrawer} interceptClose={requestCloseDrawer} />
                <div className="w-full flex items-center justify-between">
                  <span className="text-base font-slab font-bold text-warm-900">
                    {editing ? 'Редактировать певчего' : 'Добавить певчего'}
                  </span>
                  {editing && (
                    <button
                      onClick={handleArchiveClickFromEdit}
                      className="w-8 h-8 rounded-lg bg-warm-100 text-warm-600 flex items-center justify-center active:bg-warm-200 transition-colors shrink-0"
                      title="Отправить в архив"
                    >
                      <IconInboxIn size={18} />
                    </button>
                  )}
                </div>
              </DrawerHeader>

              <DrawerBody>
                <div className="flex flex-col gap-4">
                  {/* Имя + Отчество */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
                        Фамилия Имя
                      </label>
                      <input
                        className="warm-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Фамилия Имя"
                      />
                    </div>
                    <div style={{ width: 80 }}>
                      <label className="block text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
                        Отч.
                      </label>
                      <input
                        className="warm-input text-center"
                        value={patronymic}
                        onChange={(e) => setPatronymic(e.target.value.slice(0, 1).toUpperCase())}
                        placeholder="О"
                        maxLength={1}
                      />
                    </div>
                  </div>

                  {/* Роль */}
                  <div>
                    <label className="block text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
                      Роль
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {ROLES.map((r) => (
                        <button
                          key={r.value}
                          onClick={() => handleRoleChange(r.value)}
                          className={`py-2 rounded-xl text-sm font-slab font-semibold border transition-all ${
                            role === r.value
                              ? 'text-white border-transparent'
                              : 'bg-white border-warm-200 text-warm-700'
                          }`}
                          style={role === r.value ? { background: 'linear-gradient(to right, #bd9673, #7d5e42)' } : {}}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Цены */}
                  <div>
                    {(() => {
                      const defaults = buildDefaultPrices(role, eventTypeDocs)
                      const hasDiff = eventTypeDocs.some((d) => (prices[d.name] ?? 0) !== (defaults[d.name] ?? 0))
                      return (
                        <>
                          <div className="flex items-center gap-1.5 mb-2">
                            <label className="text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide">
                              Оплата за выход, ₽
                            </label>
                            {hasDiff && (
                              <button
                                type="button"
                                title="Сбросить к тарифам по умолчанию"
                                onClick={() => setShowResetConfirm(true)}
                                className="text-warm-400 hover:text-warm-600 active:scale-90 transition-all p-0.5"
                              >
                                <IconResetPrices />
                              </button>
                            )}
                          </div>
                          {showResetConfirm && (
                            <>
                              {/* Клик по фону ничего не делает — закрытие только кнопками */}
                              <div className="fixed inset-0 z-50 bg-black/50" />
                              <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
                                <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
                                  <div className="px-5 pt-6 pb-5 text-center">
                                    <h2 className="text-base font-slab font-bold text-warm-900 mb-2">Сбросить цены?</h2>
                                    <p className="text-sm text-warm-500 leading-relaxed">
                                      Личные цены будут заменены тарифами из типов выходов.
                                    </p>
                                  </div>
                                  <div className="flex border-t border-warm-100">
                                    <button
                                      onClick={() => setShowResetConfirm(false)}
                                      className="flex-1 py-3.5 text-sm font-slab font-semibold text-warm-700 active:bg-warm-50 border-r border-warm-100"
                                    >
                                      Отмена
                                    </button>
                                    <button
                                      onClick={() => { setPrices(defaults); setShowResetConfirm(false) }}
                                      className="flex-1 py-3.5 text-sm font-slab font-semibold text-[#9b7653] active:bg-warm-50"
                                    >
                                      Сбросить
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      )
                    })()}
                    {priceEventTypes.length === 0 ? (
                      <p className="text-sm text-warm-400 text-center py-4">Загрузка...</p>
                    ) : (
                      <div className="warm-card overflow-hidden">
                        {priceEventTypes.map((t, i) => {
                          const isDisabled = disabledEventTypes.includes(t)
                          const isHalved = halvedEventTypes.includes(t)
                          const defaultPrice = eventTypeDocs.find((d) => d.name === t)?.prices[role] ?? 0
                          const isOverride = (prices[t] ?? 0) !== defaultPrice
                          return (
                            <div
                              key={t}
                              className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${i < priceEventTypes.length - 1 ? 'border-b border-warm-100' : ''} ${isDisabled ? 'opacity-40' : ''}`}
                            >
                              {/* Кнопка отключения (только для чтеца) */}
                              {role === 'reader' && (
                                <button
                                  type="button"
                                  title={isDisabled ? 'Включить этот тип выхода' : 'Отключить этот тип выхода для чтеца'}
                                  onClick={() => toggleDisabledEventType(t)}
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                    isDisabled
                                      ? 'bg-red-100 text-red-500'
                                      : 'bg-warm-100 text-warm-400 active:bg-warm-200'
                                  }`}
                                >
                                  <IconClipboardRemove />
                                </button>
                              )}
                              <span className={`flex-1 text-sm font-slab font-medium ${isDisabled ? 'text-warm-400 line-through' : 'text-warm-800'}`}>
                                {t}
                              </span>
                              {/* Половинная ставка (÷2) */}
                              <button
                                type="button"
                                disabled={isDisabled}
                                title={isHalved ? 'Полная ставка' : 'Половина ставки'}
                                onClick={() => !isDisabled && toggleHalvedEventType(t)}
                                className={`flex items-center gap-0.5 h-7 px-1.5 rounded-lg border shrink-0 transition-colors disabled:cursor-not-allowed ${
                                  isHalved
                                    ? 'border-[#bd9673] bg-[#f7ece0] text-[#7d5e42]'
                                    : 'border-warm-200 bg-white text-warm-400 active:bg-warm-50'
                                }`}
                              >
                                <IconScissors />
                                <span className="text-[11px] font-slab font-bold leading-none">2</span>
                              </button>
                              <button
                                type="button"
                                disabled={isDisabled}
                                onClick={() => !isDisabled && setActiveNumpad(activeNumpad === t ? null : t)}
                                className={`text-sm font-semibold font-slab px-3 py-1 rounded-lg border transition-colors ${activeNumpad === t ? 'border-[#bd9673] bg-white text-warm-900' : 'border-warm-200 bg-warm-50 text-warm-900'} ${isOverride ? 'border-b-orange-400' : ''} disabled:cursor-not-allowed`}
                              >
                                {applyHalf(prices[t] ?? 0, isHalved).toLocaleString('ru-RU')} ₽
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </DrawerBody>

              <DrawerFooter style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
                <button
                  onClick={closeDrawer}
                  className="flex-1 py-3 rounded-xl border border-warm-200 text-warm-700 text-sm font-slab font-semibold active:bg-warm-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-slab font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}
                >
                  {saving && <LoadingSpinner size="sm" color="white" />}
                  Сохранить
                </button>
              </DrawerFooter>

              {activeNumpad && (
                <div className="absolute bottom-0 left-0 right-0 z-50">
                  <InlineNumpad
                    role={halvedEventTypes.includes(activeNumpad) ? `${activeNumpad} · полная ставка` : activeNumpad}
                    value={String(prices[activeNumpad] ?? 0)}
                    onChange={(v) => setPrices(p => ({ ...p, [activeNumpad]: parseInt(v.replace(/\D/g, '')) || 0 }))}
                    onClose={() => setActiveNumpad(null)}
                  />
                </div>
              )}
            </>
          )}
        </DrawerContent>
      </Drawer>

      <DiscardConfirm
        open={discardOpen}
        onStay={() => setDiscardOpen(false)}
        onDiscard={() => { setDiscardOpen(false); setDrawerOpen(false) }}
      />

      {/* Подтверждение удаления */}
      {deleteTarget && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => { if (!deleting) setDeleteTarget(null) }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
            <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
              <div className="px-5 pt-5 pb-4">
                <h2 className="text-base font-slab font-bold text-warm-900 mb-2">
                  Удалить певчего?
                </h2>
                <p className="text-sm text-warm-600 leading-relaxed">
                  Вы уверены, что хотите удалить{' '}
                  <span className="font-semibold text-warm-900">{deleteTarget.name}</span>?{' '}
                  Это действие нельзя отменить.
                </p>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-warm-200 text-warm-700 text-sm font-slab font-semibold active:bg-warm-50"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-slab font-semibold bg-red-500 active:bg-red-600 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {deleting && <LoadingSpinner size="sm" color="white" />}
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Подтверждение возврата из архива */}
      {restoreTarget && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/50"
            onClick={() => { if (!restoring) setRestoreTarget(null) }}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-5">
            <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
              <div className="px-5 pt-5 pb-4">
                <h2 className="text-base font-slab font-bold text-warm-900 mb-2">
                  Вернуть из архива?
                </h2>
                <p className="text-sm text-warm-600 leading-relaxed">
                  <span className="font-semibold text-warm-900">{restoreTarget.name}</span>{' '}
                  снова будет предлагаться при добавлении выходов.
                </p>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <button
                  onClick={() => setRestoreTarget(null)}
                  disabled={restoring}
                  className="flex-1 py-2.5 rounded-xl border border-warm-200 text-warm-700 text-sm font-slab font-semibold active:bg-warm-50 disabled:opacity-40"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmRestore}
                  disabled={restoring}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-slab font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}
                >
                  {restoring && <LoadingSpinner size="sm" color="white" />}
                  Вернуть
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Совпадение по ФИО при добавлении нового певчего */}
      {duplicateConfirm && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setDuplicateConfirm(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
            <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
              <div className="px-5 pt-5 pb-4">
                <h2 className="text-base font-slab font-bold text-warm-900 mb-2">
                  Такой певчий уже есть
                </h2>
                <p className="text-sm text-warm-600 leading-relaxed mb-2">
                  ФИО совпадает с уже существующей записью:
                </p>
                <div className="max-h-32 overflow-y-auto">
                  {duplicateConfirm.map((m) => (
                    <p key={m._id} className="text-sm font-slab leading-relaxed">
                      <span className="font-semibold text-warm-900">
                        {m.name}{m.patronymic ? ` ${m.patronymic}.` : ''}
                      </span>
                      <span className="text-warm-400"> — {m.isActive === false ? 'в архиве' : 'активен'}</span>
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <button
                  onClick={() => setDuplicateConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl border border-warm-200 text-warm-700 text-sm font-slab font-semibold active:bg-warm-50"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmSaveDespiteDuplicate}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-slab font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}
                >
                  {saving && <LoadingSpinner size="sm" color="white" />}
                  Всё равно добавить
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Предупреждение при архивации одного певчего с выходами в этом месяце */}
      {singleArchiveWarning && editing && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setSingleArchiveWarning(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
            <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
              <div className="px-5 pt-5 pb-4">
                <h2 className="text-base font-slab font-bold text-warm-900 mb-2">
                  Отправить в архив?
                </h2>
                <p className="text-sm text-warm-600 leading-relaxed">
                  У <span className="font-semibold text-warm-900">{editing.name}</span> уже есть
                  отметки в табеле текущего месяца. Сами выходы не изменятся, но проверьте, не рано
                  ли отправлять в архив.
                </p>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <button
                  onClick={() => setSingleArchiveWarning(false)}
                  className="flex-1 py-2.5 rounded-xl border border-warm-200 text-warm-700 text-sm font-slab font-semibold active:bg-warm-50"
                >
                  Отмена
                </button>
                <button
                  onClick={archiveSingleFromEdit}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-slab font-semibold flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}
                >
                  В архив
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Подтверждение массовой архивации */}
      {archiveConfirmOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => { if (!archivingBulk) setArchiveConfirmOpen(false) }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
            <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <h2 className="text-base font-slab font-bold text-warm-900">
                    Отправить в архив?
                  </h2>
                  <button
                    onClick={() => setArchiveInfoOpen(true)}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-warm-400 active:text-warm-600 transition-colors shrink-0"
                    title="Что это значит"
                  >
                    <IconInfo />
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {members
                    .filter((m) => selectedIds.has(m._id))
                    .map((m) => (
                      <p key={m._id} className="text-sm text-warm-800 font-slab leading-relaxed">
                        {m.name}{m.patronymic ? ` ${m.patronymic}.` : ''}
                        {currentMonthMemberIds.has(m._id) && (
                          <span className="text-amber-600"> — есть выходы в этом месяце</span>
                        )}
                      </p>
                    ))}
                </div>
                {members.some((m) => selectedIds.has(m._id) && currentMonthMemberIds.has(m._id)) && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 font-slab leading-relaxed">
                    У некоторых из выбранных уже есть отметки в табеле текущего месяца.
                    Сами эти выходы не изменятся, но проверьте, не рано ли отправлять в архив.
                  </div>
                )}
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <button
                  onClick={() => setArchiveConfirmOpen(false)}
                  disabled={archivingBulk}
                  className="flex-1 py-2.5 rounded-xl border border-warm-200 text-warm-700 text-sm font-slab font-semibold active:bg-warm-50 disabled:opacity-40"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmBulkArchive}
                  disabled={archivingBulk}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-slab font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}
                >
                  {archivingBulk && <LoadingSpinner size="sm" color="white" />}
                  В архив
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Пояснение, что значит архив — вынесено из основной модалки за иконку (i) */}
      {archiveInfoOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setArchiveInfoOpen(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-5">
            <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
              <div className="px-5 pt-5 pb-4">
                <h2 className="text-base font-slab font-bold text-warm-900 mb-2">Что это значит</h2>
                <p className="text-sm text-warm-600 leading-relaxed">
                  Певчие перестанут предлагаться при добавлении новых выходов. Уже сохранённые
                  табеля не изменятся, вернуть из архива можно в любой момент.
                </p>
              </div>
              <div className="px-4 pb-4">
                <button
                  onClick={() => setArchiveInfoOpen(false)}
                  className="w-full py-2.5 rounded-xl border border-warm-200 text-warm-700 text-sm font-slab font-semibold active:bg-warm-50"
                >
                  Понятно
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Просмотр архива */}
      <Drawer
        isOpen={archiveViewOpen}
        onOpenChange={setArchiveViewOpen}
        placement="bottom"
        scrollBehavior="inside"
        classNames={{
          base: 'bg-white rounded-t-2xl max-h-[85dvh] flex flex-col overflow-hidden drawer-sheet',
          header: 'border-b border-warm-200 px-4 pt-2 pb-3 shrink-0',
          body: 'overflow-y-auto px-4 py-4',
          closeButton: 'hidden',
        }}
      >
        <DrawerContent>
          {(closeArchive) => {
            const archivedMembers = members.filter(m => m.isActive === false)
            return (
              <>
                <DrawerHeader className="flex-col gap-0">
                  <DrawerHandle onClose={closeArchive} />
                  <div className="w-full flex items-center justify-between">
                    <span className="text-base font-slab font-bold text-warm-900">Архив</span>
                    <button
                      onClick={startBulkArchive}
                      className="w-8 h-8 rounded-lg bg-warm-100 text-warm-700 flex items-center justify-center active:bg-warm-200 transition-colors shrink-0"
                      title="Добавить в архив"
                    >
                      <IconInboxIn size={18} />
                    </button>
                  </div>
                </DrawerHeader>
                <DrawerBody>
                  {archivedMembers.length === 0 ? (
                    <p className="text-center text-warm-400 py-8 font-slab">В архиве никого нет</p>
                  ) : (
                    <div className="warm-card overflow-hidden">
                      <table className="warm-table">
                        <tbody>
                          {archivedMembers.map((m) => {
                            const { lastName, firstName } = splitName(m.name)
                            return (
                              <tr key={m._id}>
                                <td><span className="font-slab font-semibold text-warm-900">{lastName}</span></td>
                                <td className="text-center">
                                  <span className="font-slab text-warm-700">
                                    {firstName}{m.patronymic ? <span className="text-warm-500"> {m.patronymic}.</span> : null}
                                  </span>
                                </td>
                                <td style={{ width: '40px' }}>
                                  <button
                                    onClick={() => setRestoreTarget(m)}
                                    className="w-7 h-7 rounded-lg bg-green-50 text-green-600 flex items-center justify-center active:bg-green-100 transition-colors ml-auto"
                                    title="Вернуть из архива"
                                  >
                                    <IconInboxOut size={18} />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </DrawerBody>
              </>
            )
          }}
        </DrawerContent>
      </Drawer>
    </div>
  )
}
