# Architecture Specification

## Project Name

Dokter Assistant

## Overview

Dokter Assistant adalah aplikasi full-stack yang digunakan untuk membantu asisten dokter mengelola:

* Jadwal dokter
* Perjalanan dinas
* Booking hotel
* Packing list
* Tugas operasional
* Dokumen perjalanan
* Reminder dan notifikasi

Aplikasi harus mendukung akses realtime antara dokter dan tim asisten.

---

# Architecture Principles

## AP-1 Single Source of Truth

Database PostgreSQL adalah sumber data utama.

Dilarang menyimpan data bisnis utama hanya di cache, local storage, atau memory.

---

## AP-2 API First

Semua komunikasi data harus melalui API Backend.

Frontend tidak boleh mengakses database secara langsung.

---

## AP-3 Realtime By Event

Sinkronisasi realtime menggunakan Socket.io.

Dilarang menggunakan polling sebagai mekanisme utama.

---

## AP-4 Mobile Friendly

Semua fitur yang tersedia untuk dokter harus dapat digunakan di aplikasi mobile.

---

## AP-5 Security First

Semua endpoint wajib menggunakan authentication dan authorization.

Tidak boleh hanya mengandalkan proteksi di frontend.

---

# Technology Stack

## Frontend Web

Framework:

* Next.js

Language:

* TypeScript

Styling:

* Tailwind CSS

State Management:

* React Query

Forms:

* React Hook Form

Validation:

* Zod

---

## Mobile Strategy

Platform:

* Progressive Web App (PWA)

Framework:

* Next.js

Installation:

* Android: Install via Chrome (Add to Home Screen)
* iOS: Install via Safari (Add to Home Screen)

Capabilities:

* Responsive Layout
* Offline Cache (limited)
* Push Notification
* Realtime Socket Connection

Restriction:

* Tidak menggunakan React Native
* Tidak menggunakan Flutter
* Tidak membuat aplikasi Android/iOS native pada V1

# PWA Requirements

## Offline Capability

Aplikasi harus tetap dapat:

* Membuka halaman yang pernah dikunjungi
* Menampilkan cache data terakhir

Tidak wajib mendukung full offline editing pada V1.

## Installability

PWA harus dapat di-install pada:

* Android Chrome
* iPhone Safari
* Desktop Browser

## Notification

Push notification harus mendukung:

* Reminder Jadwal
* Reminder Hotel
* Reminder Task

## Update Strategy

Service Worker harus melakukan update otomatis ketika versi baru tersedia.

User akan menerima notifikasi refresh aplikasi jika diperlukan.


## Backend

Framework:

* NestJS

Language:

* TypeScript

API Style:

* REST API

Validation:

* class-validator

Authentication:

* JWT

Authorization:

* Role Based Access Control

---

## Database

Database:

* PostgreSQL

ORM:

* Prisma

Migration:

* Prisma Migration

---

## Realtime

Technology:

* Socket.io

Connection Type:

* WebSocket

Room Strategy:

doctor:{doctorProfileId}

user:{userId}

---

## Background Jobs

Queue:

* BullMQ

Broker:

* Redis

Jobs:

* reminder-dispatch
* trip-status-sync

---

## Storage

Provider:

* Cloudflare R2

Upload Method:

* Presigned URL

File Types:

* PDF
* JPG
* PNG
* HEIC

---

## Maps

Provider:

* Google Maps Platform

Services:

* Places API
* Geocoding API
* Maps Static API
* Directions URL

---

## WhatsApp

Provider:

* AppSheet Indonesia API

Capabilities:

* Send Text Message
* Send Media Message

Authentication:

* API Key

Restriction:

* Tidak menggunakan WhatsApp Cloud API
* Tidak menggunakan Twilio
* Tidak menggunakan Fonnte

---

# Deployment

## Frontend

Platform:

* Vercel

---

## Backend

Platform:

* VPS

Requirements:

* Docker
* Node.js LTS
* Redis
* PostgreSQL

---

# Forbidden Technologies

AI generator tidak boleh menggunakan teknologi berikut tanpa persetujuan eksplisit:

Frontend:

* Redux
* MobX
* Angular
* Vue

Backend:

* Express Standalone
* Laravel
* Django

Database:

* MongoDB
* Firebase Firestore

Realtime:

* Firebase Realtime Database
* Supabase Realtime
* Pusher

Storage:

* AWS S3 langsung
* Firebase Storage

Messaging:

* Twilio WhatsApp
* Meta WhatsApp Cloud API
* Fonnte

---

# Scalability Strategy

V1

* Single Doctor
* Multiple Assistants

V2

* Multiple Doctors
* Multiple Teams

Struktur database harus tetap kompatibel dengan V2 tanpa redesign besar.

---

# Decision Rule

Jika AI menemukan lebih dari satu cara implementasi:

1. Ikuti Architecture Specification
2. Ikuti Business Rules
3. Ikuti API Spec
4. Jangan membuat keputusan sendiri tanpa spesifikasi
