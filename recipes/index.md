---
layout: page
title: Recipes
---

{% for file in site.html_pages %}
{% if file.url != page.url %}
- [{{ file.title }}]({{ site.url }}/recipes{{ file.url }})
{% endif %}
{% endfor %}
