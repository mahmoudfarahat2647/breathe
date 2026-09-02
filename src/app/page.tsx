// PROTOTYPE (issue #17): swapped to the variant controller for the Control
// Deck visual-language mockup. Revert to `return <BreatheApp />;` (and
// remove the import below) once a direction is picked.
import { PrototypeVariantController } from "./prototype-variant-controller";

export default function Home() {
  return <PrototypeVariantController />;
}
