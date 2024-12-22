---
layout: page
title: File Index
---

{% for page in site.pages %}
  {% if page.path contains 'your_directory' %}
    <a href="{{ page.url }}">{{ page.title }}</a>
  {% endif %}
{% endfor %}
