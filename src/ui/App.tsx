import { useEffect } from 'react';
import { usePrefs } from '@/store/prefsStore';
import { updateSave, useSave } from '@/store/saveStore';
import { useRoute } from './router';
import { DialogHost, Toasts } from './shared/controls';
import { ModalHost } from './shared/Settings';
import { Briefing } from './pages/Briefing';
import { IslandMap } from './pages/IslandMap';
import { Journal } from './pages/Journal';
import { ScenePage } from './pages/ScenePage';
import { Title } from './pages/Title';
import { openModal, useRetry } from './uiStore';

export function App() {
  const route = useRoute();
  const motion = usePrefs((p) => p.motion);
  const retry = useRetry((s) => s.nonce);
  const notice = useSave((s) => s.notices.includes('v2-new-story'));

  useEffect(() => {
    // 'reduce-motion' stops all art animation (art.css); 'motion-lite' trims it.
    document.documentElement.classList.toggle('reduce-motion', motion === 'off');
    document.documentElement.classList.toggle('motion-lite', motion === 'lite');
  }, [motion]);

  // One-time message for players whose v1 save was cleared.
  useEffect(() => {
    if (!notice) return;
    updateSave((p) => { p.notices = p.notices.filter((n) => n !== 'v2-new-story'); }, { touch: false });
    openModal('notice');
  }, [notice]);

  let page;
  switch (route.name) {
    case 'island':
      page = <IslandMap />;
      break;
    case 'brief':
      page = <Briefing key={route.levelId} levelId={route.levelId} />;
      break;
    case 'scene':
      page = <ScenePage key={`${route.levelId}:${retry}`} levelId={route.levelId} />;
      break;
    case 'journal':
      page = <Journal />;
      break;
    default:
      page = <Title />;
  }

  return (
    <>
      {page}
      <ModalHost />
      <DialogHost />
      <Toasts />
    </>
  );
}
