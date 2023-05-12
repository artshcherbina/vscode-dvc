import * as React from 'react'
import type { SVGProps } from 'react'
const ListFilter = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    {...props}
  >
    <path d="M6 12v-1h4v1H6zM4 7h8v1H4V7zm10-4v1H2V3h12z" />
  </svg>
)
export default ListFilter
