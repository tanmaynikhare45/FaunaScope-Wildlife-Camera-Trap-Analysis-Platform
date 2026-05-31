import React from "react";
import { motion } from 'framer-motion';
import InfiniteSlider from "../components/common/InfiniteSlider";
import VideoBackground from "../components/common/VideoBackground";
import { Camera, Upload, Shield, Zap, CheckCircle } from "lucide-react";
import { BackgroundPaths } from "../components/common/BackgroundPaths";

  const Home = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <div className="absolute inset-0 -z-0 pointer-events-none">
          <BackgroundPaths />
        </div>
        
        {/* <Header /> */}
        <main className="overflow-x-hidden">
          <section className="relative">
            <div className="py-24 md:pb-32 lg:pb-36 lg:pt-72">
              {/* Video Background */}
              <div className="aspect-[2/3] absolute inset-1 overflow-hidden rounded-3xl border border-black/10 sm:aspect-video lg:rounded-[3rem] dark:border-white/5 z-0">
                <VideoBackground 
                  videoSrc="/background-video.mp4" 
                  className="rounded-3xl lg:rounded-[3rem]"
                />
              </div>
              
              {/* Text Content - positioned above video */}
              <div className="relative z-20 mx-auto flex max-w-7xl flex-col px-6 lg:block lg:px-12">
                <div className="mx-auto max-w-lg text-center lg:ml-0 lg:max-w-full lg:text-left">
                  <h1 className="mt-8 max-w-3xl text-balance text-5xl md:text-6xl lg:mt-16 xl:text-7xl font-bold text-white drop-shadow-lg">
                    AI-Powered Wildlife Camera Trap Analysis
                  </h1>
                  
                  <p className="mt-8 max-w-2xl text-balance text-lg text-white/90 drop-shadow-md">
                    Automatically detect, classify, and organize thousands of camera trap images. Save time, protect wildlife, and combat poaching with intelligent image analysis.
                  </p>

                  
                </div>
              </div>
            </div>
          </section>

          <section id="partners" className="bg-gradient-to-r from-green-100 to-emerald-100 pb-2 py-12">
            <div className="group relative m-auto max-w-7xl px-6">
              <div className="flex flex-col items-center md:flex-row">
                <div className="md:max-w-44 md:border-r md:pr-6">
                  <p className="text-end text-sm text-green-700">Layered Architecture System</p>
                </div>
                <div className="relative py-6 md:w-[calc(100%-11rem)]">
                  <InfiniteSlider speedOnHover={20} speed={40} gap={112}>
                    <div className="flex"><span className="text-2xl font-bold text-green-800">MobilenetV2 NN Classifier</span></div>
                    <div className="flex"><span className="text-2xl font-bold text-green-800">Yolov8 for classificatoin</span></div>
                    <div className="flex"><span className="text-2xl font-bold text-green-800">Real time analysis</span></div>
                    <div className="flex"><span className="text-2xl font-bold text-green-800">National Parks</span></div>
                    <div className="flex"><span className="text-2xl font-bold text-green-800">Research Institute</span></div>
                  </InfiniteSlider>
                </div>
              </div>
            </div>  
          </section>

          <section id="features" className="py-20 lg:py-32 bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100">
            <div className="container mx-auto px-6 lg:px-12">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold mb-4 text-green-800">Powerful Features for Wildlife Research</h2>
                <p className="text-lg text-green-700 max-w-2xl mx-auto">Everything you need to manage and analyze camera trap data efficiently</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { icon: <Camera className="h-6 w-6" />, title: 'Smart Detection', description: 'AI automatically identifies animals, humans, and vehicles in your camera trap images.' },
                  { icon: <CheckCircle className="h-6 w-6" />, title: 'Instant Classification', description: 'Segregate valid wildlife photos from empty frames and false triggers instantly.' },
                  { icon: <Shield className="h-6 w-6" />, title: 'Poaching Alerts', description: 'Get real-time notifications when suspicious activity or poaching indicators are detected.' },
                  { icon: <Zap className="h-6 w-6" />, title: 'Batch Processing', description: 'Process thousands of images in minutes, not days. Save countless hours of manual review.' },
                ].map((f, i) => (
                   <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-primary">{f.icon}</div>
                    <h3 className="text-xl font-semibold mb-2 text-green-800">{f.title}</h3>
                    <p className="text-green-700">{f.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  };

  export default Home;