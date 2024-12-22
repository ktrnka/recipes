---
layout: page
title: File Index
---

{% for file in site.html_pages %}
- [{{ site.url }}/recipes/{{ file.title }}]({{ file.url }})
{% endfor %}
