import * as React from 'react'

function SvgDots(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 12 3"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M2 1.094a.984.984 0 01-.304.72.958.958 0 01-.704.288.993.993 0 01-.704-.288A1.012 1.012 0 010 1.094C0 .816.096.582.288.39A.966.966 0 01.992.086c.277 0 .512.101.704.304A.933.933 0 012 1.094zm5.008 0c-.011.277-.112.517-.304.72A.958.958 0 016 2.102a1.016 1.016 0 01-.704-.304.958.958 0 01-.288-.704c0-.278.096-.512.288-.704A.882.882 0 016 .102c.277 0 .512.096.704.288a.933.933 0 01.304.704zm4.991 0a.984.984 0 01-.304.72.958.958 0 01-.704.288 1.057 1.057 0 01-.704-.304.958.958 0 01-.287-.704c0-.278.095-.512.287-.704a.911.911 0 01.704-.288c.278 0 .513.096.704.288a.933.933 0 01.304.704z"
        fill="#CCC"
      />
    </svg>
  )
}

export default SvgDots
