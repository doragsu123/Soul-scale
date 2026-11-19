import { WeightId } from '../types/game';

export interface WeightPalette {
  fill: string;
  fillDark: string;
  stroke: string;
  highlight: string;
  holeFill?: string;
}

export function getWeightArtPalette(defId: WeightId): WeightPalette {
  switch (defId) {
    case 'w_lead':
      return {
        fill: '#464a52',
        fillDark: '#26292e',
        stroke: '#8b919c',
        highlight: '#a7aeb8',
      };
    case 'w_cast':
      return {
        fill: '#2e2f34',
        fillDark: '#191a1d',
        stroke: '#7e818a',
        highlight: '#a2a5ad',
      };
    case 'w_iron':
      return {
        fill: '#515d6d',
        fillDark: '#2f3742',
        stroke: '#a5b2c2',
        highlight: '#cbd5e1',
      };
    case 'w_copper':
      return {
        fill: '#9e5d28',
        fillDark: '#593111',
        stroke: '#d99a52',
        highlight: '#f1c27d',
        holeFill: '#120e0c',
      };
    case 'w_feather':
      return {
        fill: '#cfd6df',
        fillDark: '#8b95a3',
        stroke: '#eef2f6',
        highlight: '#ffffff',
      };
    case 'w_fallen':
      return {
        fill: '#4a2130',
        fillDark: '#240d16',
        stroke: '#c96f85',
        highlight: '#e6a1b0',
      };
    case 'w_helium':
      return {
        fill: '#236b64',
        fillDark: '#103b37',
        stroke: '#76c7bd',
        highlight: '#b4ebe4',
      };
    case 'w_gold':
      return {
        fill: '#b87b22',
        fillDark: '#69420a',
        stroke: '#ebd078',
        highlight: '#fff1b8',
      };
    case 'w_crystal':
      return {
        fill: '#2d579a',
        fillDark: '#162f59',
        stroke: '#8db4eb',
        highlight: '#c7dfff',
      };
    case 'w_mirror':
      return {
        fill: '#5c6675',
        fillDark: '#2a3038',
        stroke: '#d7dee6',
        highlight: '#ffffff',
      };
    case 'w_twin':
      return {
        fill: '#484a87',
        fillDark: '#25264f',
        stroke: '#a7a9db',
        highlight: '#d4d6f5',
      };
    case 'w_mercury':
      return {
        fill: '#334155',
        fillDark: '#17202b',
        stroke: '#94a3b8',
        highlight: '#7dd3fc',
      };
    case 'w_slime':
      return {
        fill: '#2f6e3f',
        fillDark: '#173d21',
        stroke: '#80c48f',
        highlight: '#bce8c5',
      };
    case 'w_soul':
      return {
        fill: '#5f317a',
        fillDark: '#2e1340',
        stroke: '#bd96d9',
        highlight: '#e5cff5',
      };
    case 'w_crown':
      return {
        fill: '#a67421',
        fillDark: '#593b0a',
        stroke: '#e8c472',
        highlight: '#faecc2',
      };
  }
}

/**
 * Shared Canvas 2D artwork renderer for all 15 weights.
 * Drawn identically (scaled by `size`) in flight and resting on the right pan,
 * matching the canonical silhouettes of WeightGlyph.
 * Origin (0, 0) is the visual center of the weight, normalized to radius `r = size * 0.44`.
 */
export function drawWeightCanvasArt(
  ctx: CanvasRenderingContext2D,
  defId: WeightId,
  size: number,
  options?: {
    tiltRad?: number;
    glowGold?: boolean;
    rimHighlight?: string;
    showStamp?: boolean;
    weightLabel?: string;
  }
): void {
  const r = size * 0.44;
  const pal = getWeightArtPalette(defId);
  const tiltRad = options?.tiltRad ?? 0;

  ctx.save();
  if (tiltRad !== 0) {
    ctx.rotate(tiltRad);
  }

  if (options?.glowGold) {
    ctx.shadowColor = 'rgba(250, 204, 21, 0.7)';
    ctx.shadowBlur = 16;
  }

  // Upper-left lighting gradient (↖)
  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, pal.highlight);
  grad.addColorStop(0.28, pal.fill);
  grad.addColorStop(1, pal.fillDark);

  ctx.fillStyle = grad;
  ctx.strokeStyle = options?.rimHighlight ?? pal.stroke;
  ctx.lineWidth = Math.max(1.2, size * 0.04);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  switch (defId) {
    case 'w_lead': {
      // Squat heavy chamfered ingot block with top recessed dimple
      ctx.beginPath();
      ctx.moveTo(-r * 0.82, -r * 0.35);
      ctx.lineTo(-r * 0.58, -r * 0.62);
      ctx.lineTo(r * 0.58, -r * 0.62);
      ctx.lineTo(r * 0.82, -r * 0.35);
      ctx.lineTo(r * 0.96, r * 0.68);
      ctx.lineTo(-r * 0.96, r * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Top chamfer bevel highlight (upper-left)
      ctx.strokeStyle = pal.highlight;
      ctx.lineWidth = Math.max(1, size * 0.025);
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.35);
      ctx.lineTo(-r * 0.56, -r * 0.6);
      ctx.lineTo(r * 0.54, -r * 0.6);
      ctx.stroke();

      // Recessed grip dimple
      ctx.fillStyle = pal.fillDark;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.14, r * 0.28, r * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'w_copper': {
      // Thin antique round coin with one worn/scuffed edge (right-bottom rim) & square center hole
      ctx.beginPath();
      // Outer circle with subtle worn flat segment on the right side
      ctx.arc(0, 0, r * 0.92, 0.38, Math.PI * 2 - 0.32);
      ctx.lineTo(r * 0.82, -r * 0.25);
      ctx.lineTo(r * 0.8, r * 0.26);
      ctx.closePath();

      // Cut out square center hole via evenodd rule
      const h = r * 0.32;
      ctx.moveTo(-h, -h);
      ctx.lineTo(-h, h);
      ctx.lineTo(h, h);
      ctx.lineTo(h, -h);
      ctx.closePath();

      ctx.fill('evenodd');
      ctx.stroke();

      // Inner rim ring
      ctx.strokeStyle = 'rgba(241, 194, 125, 0.45)';
      ctx.lineWidth = Math.max(0.9, size * 0.02);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.68, 0.45, Math.PI * 2 - 0.4);
      ctx.stroke();

      // Worn rim scuff marks on right edge
      ctx.strokeStyle = pal.fillDark;
      ctx.lineWidth = Math.max(1, size * 0.03);
      ctx.beginPath();
      ctx.moveTo(r * 0.78, -r * 0.2);
      ctx.lineTo(r * 0.76, r * 0.22);
      ctx.stroke();
      break;
    }

    case 'w_fallen': {
      // Slender dark feather with ONE distinct notch/chip missing near the tip (upper-right)
      ctx.beginPath();
      ctx.moveTo(-r * 0.78, r * 0.84);
      ctx.quadraticCurveTo(-r * 0.55, -r * 0.22, r * 0.65, -r * 0.88);
      // Distinct chip/notch near tip!
      ctx.lineTo(r * 0.42, -r * 0.46);
      ctx.lineTo(r * 0.72, -r * 0.42);
      ctx.quadraticCurveTo(r * 0.42, r * 0.45, -r * 0.78, r * 0.84);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Quill shaft
      ctx.strokeStyle = pal.highlight;
      ctx.lineWidth = Math.max(1, size * 0.032);
      ctx.beginPath();
      ctx.moveTo(-r * 0.88, r * 0.94);
      ctx.quadraticCurveTo(-r * 0.1, r * 0.05, r * 0.62, -r * 0.82);
      ctx.stroke();
      break;
    }

    case 'w_cast': {
      // Bell-shaped cast iron weight with top ring
      ctx.beginPath();
      ctx.arc(0, -r * 0.68, r * 0.24, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-r * 0.52, -r * 0.36);
      ctx.lineTo(r * 0.52, -r * 0.36);
      ctx.lineTo(r * 0.82, r * 0.82);
      ctx.lineTo(-r * 0.82, r * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'w_iron': {
      ctx.beginPath();
      ctx.moveTo(-r * 0.68, -r * 0.48);
      ctx.lineTo(r * 0.34, -r * 0.74);
      ctx.lineTo(r * 0.88, -r * 0.08);
      ctx.lineTo(r * 0.48, r * 0.78);
      ctx.lineTo(-r * 0.72, r * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'w_feather': {
      ctx.beginPath();
      ctx.moveTo(-r * 0.76, r * 0.82);
      ctx.quadraticCurveTo(-r * 0.48, -r * 0.28, r * 0.74, -r * 0.84);
      ctx.quadraticCurveTo(r * 0.45, r * 0.36, -r * 0.76, r * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = pal.highlight;
      ctx.lineWidth = Math.max(1, size * 0.03);
      ctx.beginPath();
      ctx.moveTo(-r * 0.88, r * 0.92);
      ctx.lineTo(r * 0.66, -r * 0.76);
      ctx.stroke();
      break;
    }

    case 'w_helium': {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.96);
      ctx.lineTo(r * 0.35, -r * 0.25);
      ctx.lineTo(r * 0.88, -r * 0.5);
      ctx.lineTo(r * 0.45, r * 0.3);
      ctx.lineTo(0, r * 0.86);
      ctx.lineTo(-r * 0.45, r * 0.3);
      ctx.lineTo(-r * 0.88, -r * 0.5);
      ctx.lineTo(-r * 0.35, -r * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'w_gold': {
      ctx.beginPath();
      ctx.moveTo(0, r * 0.88);
      ctx.bezierCurveTo(-r * 1.05, r * 0.25, -r * 0.95, -r * 0.75, -r * 0.35, -r * 0.75);
      ctx.bezierCurveTo(-r * 0.12, -r * 0.75, 0, -r * 0.5, 0, -r * 0.35);
      ctx.bezierCurveTo(0, -r * 0.5, r * 0.12, -r * 0.75, r * 0.35, -r * 0.75);
      ctx.bezierCurveTo(r * 0.95, -r * 0.75, r * 1.05, r * 0.25, 0, r * 0.88);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'w_crystal': {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.98);
      ctx.lineTo(r * 0.74, -r * 0.22);
      ctx.lineTo(r * 0.48, r * 0.88);
      ctx.lineTo(-r * 0.48, r * 0.88);
      ctx.lineTo(-r * 0.74, -r * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'w_mirror': {
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.08, r * 0.72, r * 0.86, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.moveTo(-r * 0.32, -r * 0.45);
      ctx.lineTo(r * 0.28, r * 0.2);
      ctx.stroke();
      break;
    }

    case 'w_twin': {
      ctx.beginPath();
      ctx.rect(-r * 0.88, -r * 0.22, r * 0.72, r * 0.92);
      ctx.rect(r * 0.16, -r * 0.22, r * 0.72, r * 0.92);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -r * 0.22, r * 0.52, Math.PI, 0);
      ctx.stroke();
      break;
    }

    case 'w_mercury': {
      ctx.beginPath();
      ctx.moveTo(-r * 0.24, -r * 0.88);
      ctx.lineTo(r * 0.24, -r * 0.88);
      ctx.lineTo(r * 0.24, -r * 0.45);
      ctx.lineTo(r * 0.78, r * 0.25);
      ctx.quadraticCurveTo(r * 0.82, r * 0.85, r * 0.32, r * 0.88);
      ctx.lineTo(-r * 0.32, r * 0.88);
      ctx.quadraticCurveTo(-r * 0.82, r * 0.85, -r * 0.78, r * 0.25);
      ctx.lineTo(-r * 0.24, -r * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'w_slime': {
      ctx.beginPath();
      ctx.arc(0, r * 0.15, r * 0.86, Math.PI, 0);
      ctx.lineTo(r * 0.86, r * 0.72);
      ctx.quadraticCurveTo(0, r * 0.86, -r * 0.86, r * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'w_soul': {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.96);
      ctx.bezierCurveTo(r * 0.68, -r * 0.35, r * 0.74, r * 0.55, 0, r * 0.88);
      ctx.bezierCurveTo(-r * 0.74, r * 0.55, -r * 0.68, -r * 0.35, 0, -r * 0.96);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'w_crown': {
      ctx.beginPath();
      ctx.moveTo(-r * 0.88, r * 0.66);
      ctx.lineTo(-r * 0.88, -r * 0.42);
      ctx.lineTo(-r * 0.36, r * 0.04);
      ctx.lineTo(0, -r * 0.78);
      ctx.lineTo(r * 0.36, r * 0.04);
      ctx.lineTo(r * 0.88, -r * 0.42);
      ctx.lineTo(r * 0.88, r * 0.66);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
  }

  ctx.shadowBlur = 0;

  if (options?.showStamp && options?.weightLabel) {
    ctx.fillStyle = 'rgba(12, 10, 12, 0.78)';
    const pillW = Math.max(24, size * 0.76);
    ctx.fillRect(-pillW / 2, r * 0.52, pillW, 13);
    ctx.fillStyle = '#ece6da';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.weightLabel, 0, r * 0.52 + 6.5);
  }

  ctx.restore();
}
