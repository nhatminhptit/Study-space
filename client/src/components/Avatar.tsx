import { colorFor, initials } from '../utils/identity'

export default function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  return (
    <span
      className="avatar"
      title={name}
      style={{ background: colorFor(name), width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  )
}
