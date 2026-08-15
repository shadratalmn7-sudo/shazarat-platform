(() => {
  const type = document.querySelector('#type');
  const fields = [...document.querySelectorAll('[data-achievement-field]')];
  const contact = document.querySelector('#contact-method');
  const proof = document.querySelector('#proof-link');

  function updateAchievementFields() {
    const active = type?.value === 'achievement';
    fields.forEach((field) => { field.hidden = !active; });
    if (contact) contact.required = active;
    if (proof) proof.required = active;
  }

  if (new URLSearchParams(location.search).get('type') === 'achievement' && type) type.value = 'achievement';
  type?.addEventListener('change', updateAchievementFields);
  updateAchievementFields();
})();
