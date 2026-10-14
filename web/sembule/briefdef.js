// Client brief: what we ask, per kind of project. Used by the public brief page (client fills it in)
// and by the Projects screen (the team reads the answers). One definition, so the two never drift apart.

export const SERVICES = Object.freeze([
  { id: 'sound', label: 'Sound / PA', note: 'Speakers, mics, mixing' },
  { id: 'dj', label: 'DJ & MC', note: 'Music and hosting' },
  { id: 'screens', label: 'Screens & projectors', note: 'TVs, projectors, monitors' },
  { id: 'led', label: 'LED screens', note: 'Stage and outdoor walls' },
  { id: 'livestream', label: 'Livestream', note: 'Multi-camera broadcast' },
  { id: 'wedding', label: 'Wedding', note: 'Photo and film coverage' },
  { id: 'introduction', label: 'Introduction', note: 'Kwanjula / Kuhingira' },
  { id: 'photo', label: 'Photography', note: 'Events and portraits' },
  { id: 'video', label: 'Videography', note: 'Event and corporate video' },
  { id: 'music_video', label: 'Music video', note: 'Artist and song' },
  { id: 'documentary', label: 'Documentary', note: 'Story-led production' }
]);
export const serviceLabel = id => (SERVICES.find(s => s.id === id) || {}).label || id;

const yesno = ['Yes', 'No', 'Not sure'];
const t = (k, label, o = {}) => ({ k, label, type: 'text', ...o });
const ta = (k, label, o = {}) => ({ k, label, type: 'textarea', ...o });
const sel = (k, label, opts, o = {}) => ({ k, label, type: 'select', opts, ...o });
const chips = (k, label, opts, o = {}) => ({ k, label, type: 'chips', opts, ...o });
const num = (k, label, o = {}) => ({ k, label, type: 'number', ...o });

const STEP_DEFS = {
  core: { title: 'Your details', desc: 'Please confirm how we can reach you.', fields: [
    t('c_name', 'Your full name', { required: true }), t('c_org', 'Organisation (if any)'),
    t('c_phone', 'Phone / WhatsApp', { required: true, type: 'tel' }), t('c_email', 'Email', { type: 'email' }),
    sel('c_pref', 'Best way to reach you', ['WhatsApp', 'Phone call', 'Email'])] },
  event: { title: 'The event', desc: 'Tell us about the day and the place.', fields: [
    sel('ev_type', 'What kind of event is it?', ['Wedding', 'Introduction ceremony', 'Church service / crusade', 'Concert / show', 'Corporate event / conference', 'Graduation / school event', 'Birthday / party', 'Fundraiser / gala', 'Product launch', 'Other'], { required: true }),
    t('ev_name', 'Name of the event'), t('ev_start', 'Start time', { type: 'time' }), t('ev_end', 'Expected end time', { type: 'time' }),
    t('venue', 'Venue and area', { required: true }), sel('venue_type', 'Is it indoors or outdoors?', ['Indoors', 'Outdoors', 'Both']),
    num('guests', 'Expected number of guests'), t('setup', 'When can we get in to set up? Any access or parking rules?'),
    t('site_name', 'Contact person at the venue on the day'), t('site_phone', 'Their phone', { type: 'tel' }),
    ta('program', 'Programme or running order (as far as you know it)', { hint: 'Arrival, speeches, performances, meals, main moments, end time.' })] },
  wedding: { title: 'The couple and the day', desc: 'So we know the people and moments that matter most.', fields: [
    t('w_names', 'Names of the couple', { required: true }), ta('w_family', 'Key family members and who they are', { hint: 'Parents, best man, maid of honour, elders and anyone we must not miss.' }),
    t('w_prep', 'Where will the couple get ready?'), t('w_ceremony', 'Ceremony venue and time'), t('w_reception', 'Reception venue and time'),
    t('w_vendors', 'Other vendors on the day (MC, decor, cake, transport)'), ta('w_moments', 'The moments you cannot lose', { hint: 'First look, vows, cake, a surprise, a speech from someone special.' })] },
  introduction: { title: 'The introduction', desc: 'The families, the entourage and the traditions of the day.', fields: [
    t('i_names', 'Names of the couple', { required: true }), t('i_clans', 'The two families / clans'), ta('i_entourage', 'The entourage and their roles'),
    ta('i_gifts', 'Gifts and handover moments', { hint: 'Who presents what, and when.' }), ta('i_moments', 'The moments you cannot lose')] },
  sound: { title: 'Sound / PA', desc: 'So we send the right system for your crowd and your programme.', fields: [
    chips('s_use', 'What will the sound be used for?', ['Speeches and MC', 'Live band', 'Music playback', 'Choir / worship', 'Panel / Q&A', 'Stage performance']),
    num('s_hand', 'Handheld microphones needed'), num('s_lapel', 'Lapel / headset microphones needed'),
    ta('s_band', 'Live instruments or performers on stage', { hint: 'Guitar, keyboard, drums, number of singers.' }),
    sel('s_monitors', 'Do performers need stage monitors?', yesno), sel('s_power', 'Power at the venue', ['Mains power available', 'We need a generator', 'Not sure']),
    t('s_limit', 'Any noise limit or curfew?'), ta('s_extra', 'Anything else we should know?')] },
  dj: { title: 'DJ & MC', desc: 'Tell us the mood you want.', fields: [
    chips('dj_genres', 'Music styles', ['Afrobeat', 'Amapiano', 'Gospel', 'Luganda hits', 'Kadongo Kamu', 'Reggae', 'RnB', 'Hip-hop', 'Old school', 'Worship', 'Dancehall']),
    chips('mc_lang', 'MC language', ['English', 'Luganda', 'Swahili', 'Runyankole', 'Other']), sel('mc_style', 'MC style', ['Formal and polished', 'Lively and fun', 'A mix of both']),
    t('dj_hours', 'How long should the DJ play?')] },
  music: { title: 'Your music', desc: 'Pick the songs for the big moments and anything we must play, or never play.', fields: [
    t('m_entrance', 'Entrance song'), t('m_firstdance', 'First dance / first song'), t('m_cake', 'Cake cutting'), t('m_dinner', 'Dinner / background'), t('m_last', 'Last song of the night'),
    { k: 'songs', label: 'Songs you want played', type: 'songs', hint: 'Add as many as you like. Say when you want each one.' },
    ta('m_dont', 'Songs or styles we must NOT play')] },
  led: { title: 'LED screens', desc: 'What the screen is for, and where it goes.', fields: [
    sel('led_where', 'Where will the LED screen go?', ['Stage backdrop', 'Side screens', 'Outdoor wall', 'Entrance / branding wall', 'Not sure, advise us']),
    t('led_size', 'Size you have in mind', { hint: 'Or write "advise us" and tell us the venue size.' }), t('led_dist', 'How far will the furthest guest be?'),
    chips('led_content', 'What will it show?', ['Slides / presentation', 'Video playback', 'Live camera (big screen view)', 'Livestream feed', 'Logos and sponsors loop', 'Photo slideshow']),
    sel('led_supply', 'Who prepares the content?', ['We will send it', 'We need you to design it', 'A mix of both']), sel('led_mount', 'Setup', ['Ground stack', 'Hung / flown', 'On a truss', 'Not sure']),
    ta('led_extra', 'Anything else we should know?')] },
  screens: { title: 'Screens & projectors', desc: 'Tell us what needs to be seen, and by whom.', fields: [
    chips('sc_type', 'What do you need?', ['TV screens', 'Projector and screen', 'Confidence monitors for speakers']), num('sc_count', 'How many screens'),
    ta('sc_where', 'Where should they go? Describe the room or space.'), chips('sc_content', 'What will it show?', ['Slides / presentation', 'Video playback', 'Live camera', 'Livestream feed', 'Programme / agenda']),
    ta('sc_extra', 'Anything else we should know?')] },
  livestream: { title: 'Livestream', desc: 'So the broadcast starts on time and reaches everyone.', fields: [
    chips('ls_platform', 'Where should it stream?', ['YouTube', 'Facebook', 'Zoom', 'Instagram', 'TikTok', 'Other']), sel('ls_keys', 'Who creates the stream link?', ['We create it', 'You create it', 'Not sure']),
    t('ls_audience', 'Who is the online audience and how many?'), sel('ls_net', 'Internet at the venue', ['Venue has stable internet', 'Please bring your own (MTN / Airtel)', 'Not sure']),
    sel('ls_graphics', 'Do you want names, logos and lower-third graphics on screen?', yesno), sel('ls_record', 'Do you also want a full recording to keep?', yesno),
    t('ls_start', 'What time should the stream go live?', { type: 'time' }), ta('ls_extra', 'Anything else we should know?')] },
  photo: { title: 'Photography', desc: 'What we shoot, and how you want it to feel.', fields: [
    chips('ph_deliver', 'What do you want delivered?', ['Edited photos online', 'Same-day previews', 'Printed album', 'Framed prints']), sel('ph_style', 'Style', ['Natural and candid', 'Posed and formal', 'A mix of both']),
    ta('ph_must', 'Must-have shots and group photos', { hint: 'Family groups, VIPs, details, anyone special.' }), ta('ph_ref', 'Links or examples you like')] },
  video: { title: 'Videography', desc: 'What we film, and what you want at the end.', fields: [
    chips('vd_deliver', 'What do you want delivered?', ['Highlight film', 'Full event edit', 'Social media reels', 'Same-day edit', 'Raw footage']), t('vd_length', 'Preferred length of the main film'),
    sel('vd_drone', 'Do you want drone footage?', yesno), ta('vd_must', 'Must-have moments and interviews'), ta('vd_ref', 'Links or examples you like')] },
  music_video: { title: 'Music video', desc: 'The song, the idea and the look.', fields: [
    t('mv_artist', 'Artist name', { required: true }), t('mv_song', 'Song title', { required: true }), ta('mv_concept', 'The idea or story of the video'),
    ta('mv_locations', 'Locations you want'), num('mv_looks', 'Number of outfits / looks'), chips('mv_extra', 'Will you need', ['Dancers', 'Choreography', 'Styling and makeup', 'Studio set', 'Drone shots']),
    t('mv_release', 'When do you plan to release it?'), ta('mv_ref', 'Links to videos you like')] },
  documentary: { title: 'Documentary', desc: 'The story we are telling.', fields: [
    t('d_subject', 'What is the documentary about?', { required: true }), ta('d_story', 'The story in your own words'), ta('d_people', 'People we should interview'), ta('d_locations', 'Places we should film'),
    t('d_runtime', 'Length you have in mind'), chips('d_where', 'Where will it be shown?', ['TV', 'YouTube', 'Festival', 'Internal / organisation', 'Social media']), t('d_when', 'When do you need it finished?')] },
  permissions: { title: 'Sharing and permissions', desc: 'How we may use the photos and videos from your day.', fields: [
    sel('perm_social', 'May we share highlights on our social media and portfolio?', ['Yes, you may', 'Yes, but ask me first', 'No, keep everything private']), ta('perm_notes', 'Any limits?', { hint: 'For example: no children\'s faces, no logos.' })] },
  final: { title: 'Final details', desc: 'Last things before we finish.', fields: [
    t('em_name', 'Emergency contact on the day'), t('em_phone', 'Their phone', { type: 'tel' }), ta('notes', 'Anything else you want us to know?'),
    { k: 'confirm', label: 'I confirm these details are correct, and I understand I can update them until the week of the event.', type: 'check', required: true }] }
};

const ORDER = ['wedding', 'introduction', 'sound', 'dj', 'music', 'led', 'screens', 'livestream', 'photo', 'video', 'music_video', 'documentary'];
export function briefSteps(services = []) {
  const has = id => services.includes(id), keys = ['core', 'event'];
  for (const k of ORDER) { if (k === 'music' ? (has('sound') || has('dj') || has('wedding') || has('introduction')) : has(k)) keys.push(k); }
  keys.push('permissions', 'final');
  return keys.map(id => ({ id, ...STEP_DEFS[id] }));
}
export function answered(data, f) { const v = data?.[f.k]; return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '' && v !== false; }
