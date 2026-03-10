<template>
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <PublicHeader />
    <main class="flex flex-1 flex-col pt-6">
      <slot />
    </main>
  </div>
</template>
