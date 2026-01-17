import type { VisualEffect } from '../hooks/useVisualEffects'; // 型だけインポート

export const drawEffect = (ctx: CanvasRenderingContext2D, effect: VisualEffect) => {
  ctx.save();
  ctx.globalAlpha = effect.opacity;
  ctx.strokeStyle = 'white';

  switch (effect.type) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'square':
      ctx.translate(effect.x, effect.y);
      ctx.rotate(effect.rotation);
      ctx.strokeRect(-effect.size/2, -effect.size/2, effect.size, effect.size);
      break;
    case 'triangle':
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.rotation);
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          ctx.lineTo(
            effect.size * Math.cos((i * 2 * Math.PI) / 3),
            effect.size * Math.sin((i * 2 * Math.PI) / 3)
          );
        }
        ctx.closePath();
        ctx.stroke();
        break;
    case 'line':
        ctx.beginPath();
        ctx.moveTo(effect.x - effect.size, effect.y);
        ctx.lineTo(effect.x + effect.size, effect.y);
        ctx.lineWidth = effect.lineWidth;
        ctx.stroke();
        break;
    default:
      break;
  }
  ctx.restore();
};