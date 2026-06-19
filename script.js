(function () {
  'use strict';

  const form = document.getElementById('calcForm');
  const calcBtn = document.getElementById('calcBtn');
  const resultsGrid = document.getElementById('resultsGrid');

  const resultTotal = document.getElementById('resultTotal');
  const resultContributions = document.getElementById('resultContributions');
  const resultGrowth = document.getElementById('resultGrowth');
  const resultInflationAdjusted = document.getElementById('resultInflationAdjusted');
  const resultMonthlyIncome = document.getElementById('resultMonthlyIncome');
  const resultsSummaryText = document.getElementById('resultsSummaryText');

  const currentAgeInput = document.getElementById('currentAge');
  const retireAgeInput = document.getElementById('retireAge');

  let chartInstance = null;

  function formatDollar(value) {
    if (Math.abs(value) >= 1e12) return '$' + (value / 1e12).toFixed(2) + 'T';
    if (Math.abs(value) >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
    if (Math.abs(value) >= 1e6) return '$' + (value / 1e6).toFixed(2) + 'M';
    return '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function formatDollarFull(value) {
    return '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function formatNumber(value) {
    return Number(value).toLocaleString('en-US');
  }

  function showError(input, message) {
    const group = input.closest('.form-group');
    const existing = group.querySelector('.form-error');
    if (existing) existing.remove();
    input.classList.add('form-input--error');
    const error = document.createElement('span');
    error.className = 'form-error';
    error.textContent = message;
    group.appendChild(error);
  }

  function clearError(input) {
    const group = input.closest('.form-group');
    const existing = group.querySelector('.form-error');
    if (existing) existing.remove();
    input.classList.remove('form-input--error');
  }

  function clearAllErrors() {
    document.querySelectorAll('.form-input--error').forEach(function (el) {
      el.classList.remove('form-input--error');
    });
    document.querySelectorAll('.form-error').forEach(function (el) {
      el.remove();
    });
  }

  function validateForm(data) {
    let valid = true;

    if (!data.currentAge || data.currentAge < 18 || data.currentAge > 99) {
      showError(currentAgeInput, 'Enter a valid age between 18 and 99');
      valid = false;
    } else {
      clearError(currentAgeInput);
    }

    if (!data.retireAge || data.retireAge < 40 || data.retireAge > 85) {
      showError(retireAgeInput, 'Enter a valid retirement age between 40 and 85');
      valid = false;
    } else {
      clearError(retireAgeInput);
    }

    if (data.retireAge <= data.currentAge) {
      showError(retireAgeInput, 'Retirement age must be greater than current age');
      valid = false;
    }

    if (data.savings < 0 || data.savings === '' || data.savings === null) {
      showError(document.getElementById('savings'), 'Enter a valid savings amount');
      valid = false;
    } else {
      clearError(document.getElementById('savings'));
    }

    if (data.monthlyContribution < 0 || data.monthlyContribution === '' || data.monthlyContribution === null) {
      showError(document.getElementById('monthlyContribution'), 'Enter a valid contribution amount');
      valid = false;
    } else {
      clearError(document.getElementById('monthlyContribution'));
    }

    if (data.returnRate < 0 || data.returnRate > 30 || data.returnRate === '' || data.returnRate === null) {
      showError(document.getElementById('returnRate'), 'Enter a rate between 0% and 30%');
      valid = false;
    } else {
      clearError(document.getElementById('returnRate'));
    }

    if (data.inflationRate < 0 || data.inflationRate > 20 || data.inflationRate === '' || data.inflationRate === null) {
      showError(document.getElementById('inflationRate'), 'Enter a rate between 0% and 20%');
      valid = false;
    } else {
      clearError(document.getElementById('inflationRate'));
    }

    return valid;
  }

  function calculateRetirement(data) {
    const years = data.retireAge - data.currentAge;

    const annualReturn = data.returnRate / 100;
    const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
    const totalMonths = years * 12;

    const futureSavings = data.savings * Math.pow(1 + annualReturn, years);

    const annuityFactor = (Math.pow(1 + monthlyReturn, totalMonths) - 1) / monthlyReturn;
    const futureContributions = data.monthlyContribution * annuityFactor;

    const totalSavings = futureSavings + futureContributions;
    const totalContributions = data.savings + data.monthlyContribution * totalMonths;
    const investmentGrowth = totalSavings - totalContributions;

    const annualInflation = data.inflationRate / 100;
    const inflationAdjusted = totalSavings / Math.pow(1 + annualInflation, years);

    const monthlyIncome = totalSavings * 0.04 / 12;

    return {
      totalSavings: Math.round(totalSavings),
      totalContributions: Math.round(totalContributions),
      investmentGrowth: Math.round(investmentGrowth),
      inflationAdjusted: Math.round(inflationAdjusted),
      monthlyIncome: Math.round(monthlyIncome),
    };
  }

  function buildChartData(data) {
    const years = data.retireAge - data.currentAge;
    const annualReturn = data.returnRate / 100;
    const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
    const totalMonths = years * 12;
    const monthlyContrib = data.monthlyContribution;

    const labels = [];
    const savingsData = [];
    const contributionsData = [];

    for (let y = 0; y <= years; y++) {
      const age = data.currentAge + y;
      labels.push(age.toString());

      const monthsElapsed = y * 12;
      const fvLump = data.savings * Math.pow(1 + annualReturn, y);

      if (monthsElapsed === 0) {
        contributionsData.push(data.savings);
        savingsData.push(data.savings);
      } else {
        const contribFV = data.monthlyContribution *
          ((Math.pow(1 + monthlyReturn, monthsElapsed) - 1) / monthlyReturn);
        savingsData.push(Math.round(fvLump + contribFV));

        const totalContrib = data.savings + monthlyContrib * monthsElapsed;
        contributionsData.push(Math.round(totalContrib));
      }
    }

    return { labels, savingsData, contributionsData };
  }

  function renderChart(data) {
    const ctx = document.getElementById('retirementChart').getContext('2d');

    if (chartInstance) {
      chartInstance.destroy();
    }

    const chartData = buildChartData(data);

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Total Savings',
            data: chartData.savingsData,
            borderColor: '#3b82f6',
            backgroundColor: function (context) {
              const chartArea = context.chart.chartArea;
              if (!chartArea) return 'rgba(59,130,246,0.1)';
              return getGradient(context.chart.ctx, chartArea, '#3b82f6');
            },
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            borderWidth: 3,
          },
          {
            label: 'Total Contributions',
            data: chartData.contributionsData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.05)',
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            borderWidth: 2,
            borderDash: [6, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { family: 'Inter', size: 14, weight: '500' },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.95)',
            titleFont: { family: 'Inter', size: 14, weight: '600' },
            bodyFont: { family: 'Inter', size: 13 },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function (context) {
                return context.dataset.label + ': ' + formatDollarFull(context.parsed.y);
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Age (Years)',
              font: { family: 'Inter', size: 13, weight: '500' },
              color: '#64748b',
            },
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 12 } },
          },
          y: {
            title: {
              display: true,
              text: 'Value ($)',
              font: { family: 'Inter', size: 13, weight: '500' },
              color: '#64748b',
            },
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: {
              font: { family: 'Inter', size: 12 },
              callback: function (value) { return formatDollar(value); },
            },
          },
        },
      },
    });
  }

  function getGradient(ctx, chartArea, color) {
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, color + '33');
    gradient.addColorStop(1, color + '05');
    return gradient;
  }

  function displayResults(data, results) {
    resultTotal.textContent = formatDollar(results.totalSavings);
    resultContributions.textContent = formatDollar(results.totalContributions);
    resultGrowth.textContent = formatDollar(results.investmentGrowth);
    resultInflationAdjusted.textContent = formatDollar(results.inflationAdjusted);
    resultMonthlyIncome.textContent = formatDollar(results.monthlyIncome);

    resultsSummaryText.innerHTML =
      'Based on your inputs, at age <strong>' + data.retireAge + '</strong> you would have ' +
      '<strong>' + formatDollarFull(results.totalSavings) + '</strong> in total retirement savings. ' +
      'Your estimated monthly retirement income is <strong>' + formatDollarFull(results.monthlyIncome) + '</strong>.';

    resultsGrid.classList.add('results-grid--visible');

    resultsGrid.querySelectorAll('.result-card').forEach(function (card, index) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      setTimeout(function () {
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 100 + index * 80);
    });

    setTimeout(function () {
      document.getElementById('chart').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  }

  function setLoading(isLoading) {
    if (isLoading) {
      calcBtn.classList.add('btn--loading');
      calcBtn.disabled = true;
    } else {
      calcBtn.classList.remove('btn--loading');
      calcBtn.disabled = false;
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    clearAllErrors();

    const data = {
      currentAge: parseInt(currentAgeInput.value, 10),
      retireAge: parseInt(retireAgeInput.value, 10),
      savings: parseFloat(document.getElementById('savings').value) || 0,
      monthlyContribution: parseFloat(document.getElementById('monthlyContribution').value) || 0,
      returnRate: parseFloat(document.getElementById('returnRate').value) || 0,
      inflationRate: parseFloat(document.getElementById('inflationRate').value) || 0,
    };

    if (!validateForm(data)) {
      resultsGrid.classList.remove('results-grid--visible');
      return;
    }

    setLoading(true);

    setTimeout(function () {
      try {
        const results = calculateRetirement(data);

        displayResults(data, results);
        renderChart(data);

        resultsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        resultsSummaryText.textContent = 'An error occurred. Please check your inputs and try again.';
      } finally {
        setLoading(false);
      }
    }, 600);
  }

  form.addEventListener('submit', handleSubmit);

  form.addEventListener('input', function (e) {
    if (e.target.classList.contains('form-input')) {
      clearError(e.target);
    }
  });

  /* ===== NAV TOGGLE ===== */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.querySelector('.nav__links');

  navToggle.addEventListener('click', function () {
    this.classList.toggle('active');
    navLinks.classList.toggle('open');
  });

  document.querySelectorAll('.nav__links a').forEach(function (link) {
    link.addEventListener('click', function () {
      navToggle.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });

  /* ===== NAV SCROLL SHADOW ===== */
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  window.addEventListener('scroll', function () {
    const current = window.pageYOffset;
    if (current > 50) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }
    lastScroll = current;
  }, { passive: true });

  /* ===== FAQ ACCORDION ===== */
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const item = this.closest('.faq-item');
      const isActive = item.classList.contains('active');

      item.closest('.faq-list').querySelectorAll('.faq-item.active').forEach(function (openItem) {
        openItem.classList.remove('active');
        openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });

      if (!isActive) {
        item.classList.add('active');
        this.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ===== SMOOTH SCROLL (fallback) ===== */
  document.querySelectorAll('.smooth-scroll').forEach(function (link) {
    link.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  /* ===== SCROLL REVEAL ===== */
  const revealElements = document.querySelectorAll('.content-card, .faq-item, .calculator-card, .chart-card');

  function checkReveal() {
    const windowHeight = window.innerHeight;
    revealElements.forEach(function (el) {
      const rect = el.getBoundingClientRect();
      if (rect.top < windowHeight - 60) {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }
    });
  }

  revealElements.forEach(function (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  });

  window.addEventListener('load', checkReveal);
  window.addEventListener('scroll', checkReveal, { passive: true });
  window.addEventListener('resize', checkReveal, { passive: true });

  /* ===== INPUT FOCUS ANIMATION ===== */
  document.querySelectorAll('.form-input').forEach(function (input) {
    input.addEventListener('focus', function () {
      this.closest('.form-input-wrap').style.transform = 'scale(1.01)';
    });
    input.addEventListener('blur', function () {
      this.closest('.form-input-wrap').style.transform = 'scale(1)';
    });
  });

  /* ===== INITIAL DEFAULT CHART ===== */
  function initDefaultChart() {
    const defaultData = {
      currentAge: 50,
      retireAge: 65,
      savings: 250000,
      monthlyContribution: 1000,
      returnRate: 7,
      inflationRate: 2.5,
    };
    renderChart(defaultData);
  }
  initDefaultChart();

  console.log('%c RetireCalc v1.0 ',
    'background:#1e40af;color:#fff;font-weight:bold;padding:4px 8px;border-radius:4px;font-size:14px;');
  console.log('Free Retirement Planning Tool loaded successfully.');

})();
