class CookModeToggle extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.wakeLock = null;
    }

    connectedCallback() {
        this.render();
    }

    async toggle() {
        if (!('wakeLock' in navigator)) {
            alert('Screen Wake Lock is not supported in this browser.');
            return;
        }

        if (!this.wakeLock) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                this.wakeLock.addEventListener('release', () => {
                    this.wakeLock = null;
                    this.render();
                });
            } catch (err) {
                console.error('Wake Lock error:', err.name, err.message);
            }
        } else {
            try {
                await this.wakeLock.release();
                this.wakeLock = null;
            } catch (err) {
                console.error('Release error:', err.name, err.message);
            }
        }
        this.render();
    }

    render() {
        const on = !!this.wakeLock;
        this.shadowRoot.innerHTML = `
      <style>
        button {
          padding: 0.75rem 1.25rem;
          font-size: 1rem;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          color: white;
          background: ${on ? '#3f8257' : '#666666'};
        }
      </style>
      <button>${on ? 'Cook mode: ON' : 'Cook mode: OFF'}</button>
    `;
        this.shadowRoot.querySelector('button')
            .onclick = () => this.toggle();
    }
}

customElements.define('cook-mode-toggle', CookModeToggle);

// Add checkboxes to any <div class="ingredients"> with list items.
// Each line's text goes in <span class="ing-text"> so ingredient-tools.js can rewrite amounts.
// Nested lists stay nested: only the item's own text moves into the label.
function addIngredientCheckboxes() {
  document
    .querySelectorAll('.ingredients li')
    .forEach(li => {
      const own = [...li.childNodes].filter(n => !(n.nodeType === 1 && /^(UL|OL)$/.test(n.tagName)));
      const nested = [...li.childNodes].filter(n => !own.includes(n));

      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'ingredient-check';
      const text = document.createElement('span');
      text.className = 'ing-text';
      text.textContent = own.map(n => n.textContent).join('').trim();
      text.dataset.original = text.textContent;
      label.appendChild(checkbox);
      label.appendChild(text);

      li.textContent = '';
      li.appendChild(label);
      nested.forEach(n => li.appendChild(n));
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addIngredientCheckboxes);
else addIngredientCheckboxes();
