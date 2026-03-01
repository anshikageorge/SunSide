export interface WeatherData {
  temp: number;
  condition: 'Clear' | 'Clouds' | 'Rain' | 'Snow' | 'Drizzle' | 'Thunderstorm' | 'Atmosphere';
  description: string;
  cloudiness: number;
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  const apiKey = (import.meta as any).env.VITE_OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
    );
    const data = await response.json();
    
    if (data.cod !== 200) throw new Error(data.message);

    return {
      temp: data.main.temp,
      condition: data.weather[0].main,
      description: data.weather[0].description,
      cloudiness: data.clouds.all,
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}
