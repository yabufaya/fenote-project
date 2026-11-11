import CountUp from './CountUp';
import { splitNumericText } from '../../utils/countValue';

// Animates number tokens inside a translated label without touching the rest
// of the sentence. Example: "12+ Years Experience" -> counting 12, then "+ ...".
export default function CountUpText({ text, className = '', countProps = {}, ...props }) {
  const parts = splitNumericText(text);

  return (
    <span className={className} {...props}>
      {parts.map((part, i) => part.type === 'number' ? (
        <CountUp key={i} value={part.value} suffix={part.suffix} {...countProps} />
      ) : (
        <span key={i}>{part.value}</span>
      ))}
    </span>
  );
}
