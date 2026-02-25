export const RoundButton = ({ color, handleClick, selected }: any) => (
  <button
    type="button"
    aria-label={`Select color ${color}`}
    className={`w-8 h-8 rounded-full inline-block m-1 transition-all ${
      selected ? "ring-2 ring-gray-500 ring-offset-1" : ""
    }`}
    style={{ backgroundColor: color }}
    onClick={handleClick}
  />
);
